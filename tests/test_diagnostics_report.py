"""Opt-in diagnostics: the payload (counts only, scrubbed errors) and that nothing is sent while off."""

from __future__ import annotations

import time
import uuid

from homeassistant.core import HomeAssistant
from homeassistant.helpers import instance_id
from homeassistant.setup import async_setup_component
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.axonometra import diagnostics_report as diag
from custom_components.axonometra.const import DATA_DIAGNOSTICS, DOMAIN

REPORT_URL = f"{diag.TELEMETRY_API}/report"
DELETE_URL = f"{diag.TELEMETRY_API}/delete"

BUILDING = {
    "floors": [
        {
            "name": "Erdgeschoss",
            "rooms": [{"name": "Wohnzimmer"}, {"name": "Küche"}],
            "furniture": [{"type": "sofa"}],
            "placements": [{"entity_id": "camera.garden"}, {"entity_id": "light.wohnzimmer_decke"}],
            "outdoor": [{"kind": "lawn"}],
        },
        {"name": "OG", "rooms": [{"name": "Bad"}], "furniture": [], "placements": []},
    ]
}
PACKS = [
    {"id": "mastershort.pro_energy", "features": ["energy_pro"], "licensee": "Anna Example"},
    {"id": "mastershort.pro_time", "features": ["time_travel", "teleport"]},
    {"id": "studio.anna-sofa", "features": []},
]


def test_error_messages_are_scrubbed() -> None:
    assert diag.scrub("TypeError: x is undefined") == "TypeError: x is undefined"
    assert (
        diag.scrub("Cannot read light.wohnzimmer_decke at https://192.168.1.5:8123/api")
        == "Cannot read <entity> at <url>"
    )
    assert (
        diag.scrub("binary_sensor.door failed for anna@example.com from 10.0.0.2")
        == "<entity> failed for <email> from <ip>"
    )
    assert diag.scrub("my_custom.living_room_temp is NaN") == "<entity> is NaN"
    assert diag.scrub("token eyJhbGc.eyJzdWIi.c2ln id deadbeefdeadbeef0011") == "token <token> id <id>"
    assert diag.scrub("this.viewer is null") == "this.viewer is null"
    assert len(diag.scrub("x" * 500)) == diag.MAX_MESSAGE


def test_clients_and_errors_are_merged_and_limited() -> None:
    clients = diag.merge_client(
        [], {"device": "tablet", "browser": "Silk 120", "os": "Android 9", "fps": 20, "fps_n": 2, "views": {"3d": 2}}
    )
    clients = diag.merge_client(
        clients,
        {
            "device": "tablet",
            "browser": "Silk 120",
            "os": "Android 9",
            "fps": 30,
            "fps_n": 2,
            "views": {"3d": 1, "editor": 1},
            "low_end": True,
            "gpu_tier": "low",
        },
    )
    assert len(clients) == 1
    assert clients[0]["fps"] == 25.0 and clients[0]["views"] == {"3d": 3, "editor": 1}
    assert clients[0]["low_end"] is True and clients[0]["gpu_tier"] == "low"
    # anything unexpected becomes "other", never free text
    odd = diag.merge_client([], {"device": "toaster", "browser": "<script>alert(1)</script>", "os": "Android 9"})
    assert odd[0]["device"] == "desktop" and odd[0]["browser"] == "other"
    many = []
    for i in range(15):
        many = diag.merge_client(many, {"device": "phone", "browser": f"Chrome {100 + i}", "os": "Android 14"})
    assert len(many) == diag.MAX_CLIENTS

    errors = diag.merge_errors(
        [],
        [
            {"msg": "TypeError at light.kitchen", "where": "axonometra-3d.js:1:23", "count": 2, "version": "1.17.0"},
            {"msg": "TypeError at light.bath", "where": "axonometra-3d.js:1:23", "count": 1, "version": "1.17.0"},
            {"msg": "not ours", "where": "https://evil/app.js:1:2"},
        ],
    )
    assert errors == [
        {"msg": "TypeError at <entity>", "where": "axonometra-3d.js:1:23", "count": 3, "version": "1.17.0"}
    ]
    errors = diag.merge_errors([], [{"msg": f"E{i}", "where": "axonometra.js:1:1"} for i in range(30)])
    assert len(errors) == diag.MAX_ERRORS


def test_payload_has_counts_and_ids_only() -> None:
    state = {
        "id": "abc",
        "clients": [
            {"device": "tablet", "browser": "Silk 120", "os": "Android 9", "fps": 24.0, "fps_n": 9, "views": {}}
        ],
        "errors": [],
    }
    payload = diag.build_payload(
        state, kind="daily", building=BUILDING, packs=PACKS, axonometra="1.17.0", ha="2026.10.1", lang="de-DE"
    )
    assert set(payload) == {
        "v",
        "id",
        "kind",
        "axonometra",
        "ha",
        "python",
        "lang",
        "packs",
        "pro",
        "plan",
        "clients",
        "errors",
    }
    assert payload["v"] == 1 and payload["kind"] == "daily" and payload["lang"] == "de"
    assert payload["packs"] == ["mastershort.pro_energy", "mastershort.pro_time"]
    assert payload["pro"] == ["energy_pro", "time_travel"]
    assert payload["plan"] == {"floors": 2, "rooms": 3, "furniture": 1, "devices_linked": 2, "outdoor": 1, "cameras": 1}
    assert payload["clients"] == [
        {"device": "tablet", "browser": "Silk 120", "os": "Android 9", "fps": 24.0, "views": {}}
    ]
    text = repr(payload)
    for private in ("Wohnzimmer", "Erdgeschoss", "light.", "camera.", "Anna", "studio."):
        assert private not in text
    # an error batch carries no clients
    assert (
        diag.build_payload(state, kind="errors", building=BUILDING, packs=PACKS, axonometra="1", ha="1", lang="en")[
            "clients"
        ]
        == []
    )


async def _setup(hass: HomeAssistant) -> diag.DiagnosticsReporter:
    await async_setup_component(hass, "http", {})
    entry = MockConfigEntry(domain=DOMAIN, data={})
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return hass.data[DATA_DIAGNOSTICS]


async def test_nothing_is_sent_while_off(hass: HomeAssistant, hass_ws_client, aioclient_mock) -> None:
    reporter = await _setup(hass)
    aioclient_mock.post(REPORT_URL, json={"ok": True})
    client = await hass_ws_client(hass)

    await client.send_json_auto_id({"type": "axonometra/diagnostics/get"})
    status = (await client.receive_json())["result"]
    assert status["enabled"] is False and status["preview"]["id"] is None and status["can_delete"] is False

    # a frontend's aggregate is dropped and it is told not to collect
    await client.send_json_auto_id(
        {
            "type": "axonometra/diagnostics/client",
            "client": {"device": "tablet", "browser": "Chrome 120", "os": "Android 9"},
        }
    )
    assert (await client.receive_json())["result"] == {"enabled": False}
    assert reporter.state["clients"] == []

    await reporter.async_tick(time.time() + 10 * 86400)
    assert aioclient_mock.call_count == 0


async def test_daily_report_and_delete(hass: HomeAssistant, hass_ws_client, aioclient_mock) -> None:
    reporter = await _setup(hass)
    aioclient_mock.post(REPORT_URL, json={"ok": True})
    aioclient_mock.post(DELETE_URL, json={"ok": True})
    client = await hass_ws_client(hass)

    await client.send_json_auto_id({"type": "axonometra/diagnostics/set", "enabled": True})
    status = (await client.receive_json())["result"]
    report_id = status["preview"]["id"]
    assert status["enabled"] is True and str(uuid.UUID(report_id)) == report_id
    assert report_id != await instance_id.async_get(hass)

    await client.send_json_auto_id(
        {
            "type": "axonometra/diagnostics/client",
            "client": {
                "device": "tablet",
                "browser": "Silk 120",
                "os": "Android 9",
                "fps": 24,
                "fps_n": 3,
                "views": {"3d": 2},
            },
            "errors": [
                {"msg": "TypeError at sensor.power", "where": "axonometra-3d.js:1:5", "count": 1, "version": "1.17.0"}
            ],
        }
    )
    assert (await client.receive_json())["result"] == {"enabled": True}

    # not due yet: the first report goes a day after switching on, errors at most once an hour
    await reporter.async_tick(time.time() + 60)
    assert aioclient_mock.call_count == 0
    await reporter.async_tick(time.time() + diag.ERROR_INTERVAL + 60)
    assert aioclient_mock.call_count == 1
    sent = aioclient_mock.mock_calls[-1][2]
    assert sent["kind"] == "errors" and sent["clients"] == []
    assert sent["errors"] == [
        {"msg": "TypeError at <entity>", "where": "axonometra-3d.js:1:5", "count": 1, "version": "1.17.0"}
    ]
    assert reporter.state["errors"] == []

    await reporter.async_tick(time.time() + diag.DAILY_INTERVAL + 60)
    assert aioclient_mock.call_count == 2
    sent = aioclient_mock.mock_calls[-1][2]
    assert sent["kind"] == "daily" and sent["id"] == report_id
    assert sent["clients"] == [
        {
            "device": "tablet",
            "browser": "Silk 120",
            "os": "Android 9",
            "low_end": None,
            "render_scale": None,
            "fps": 24.0,
            "gpu_tier": None,
            "views": {"3d": 2},
        }
    ]
    # once a day only
    await reporter.async_tick(time.time() + diag.DAILY_INTERVAL + 120)
    assert aioclient_mock.call_count == 2

    await client.send_json_auto_id({"type": "axonometra/diagnostics/delete"})
    result = await client.receive_json()
    assert result["success"], result
    assert aioclient_mock.mock_calls[-1][1].path.endswith("/telemetry/v1/delete")
    assert aioclient_mock.mock_calls[-1][2] == {"id": report_id}
    assert result["result"]["enabled"] is False and result["result"]["can_delete"] is False
    assert reporter.state["id"] is None
