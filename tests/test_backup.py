"""Full backup: export of plan and packs, restore with a fresh signature check."""

from __future__ import annotations

import base64
import json

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from homeassistant.core import HomeAssistant
from homeassistant.setup import async_setup_component
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.axonometra import packs
from custom_components.axonometra.const import DOMAIN
from tests.test_init import BUILDING

PAYLOAD = {
    "format": "fp3dpack",
    "version": 1,
    "id": "test.backup",
    "name": "Backup",
    "publisher": "Test",
    "items": [
        {
            "id": "cube",
            "name": {"de": "Würfel", "en": "Cube"},
            "size": [0.5, 0.5, 0.5],
            "parts": [{"shape": "box", "x": 0, "z": 0, "w": 1, "d": 1, "y": 0, "h": 1, "color": "body"}],
        }
    ],
}


def _key() -> tuple[Ed25519PrivateKey, dict[str, str]]:
    private = Ed25519PrivateKey.generate()
    raw = private.public_key().public_bytes(serialization.Encoding.Raw, serialization.PublicFormat.Raw)
    return private, {packs.key_id(raw): base64.b64encode(raw).decode()}


def _sign(private: Ed25519PrivateKey, keys: dict[str, str], payload: dict) -> str:
    sig = base64.b64encode(private.sign(packs.canonical(payload))).decode()
    return json.dumps({"payload": payload, "signature": {"key": next(iter(keys)), "sig": sig}})


async def test_backup_round_trip(hass: HomeAssistant, hass_ws_client, monkeypatch) -> None:
    private, keys = _key()
    monkeypatch.setattr(packs, "PACK_PUBLIC_KEYS", keys)
    await async_setup_component(hass, "http", {})
    entry = MockConfigEntry(domain=DOMAIN, data={})
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    client = await hass_ws_client(hass)

    # an imported pack keeps its signature
    await client.send_json_auto_id({"type": "axonometra/packs/import", "pack": _sign(private, keys, PAYLOAD)})
    assert (await client.receive_json())["success"]
    building = json.loads(json.dumps(BUILDING))
    building["floors"][0]["name"] = "Backup floor"
    await client.send_json_auto_id({"type": "axonometra/building/save", "building": building})
    assert (await client.receive_json())["success"]

    await client.send_json_auto_id({"type": "axonometra/backup/export"})
    backup = (await client.receive_json())["result"]
    assert backup["format"] == "neonplan3d-backup"
    assert backup["building"]["floors"][0]["name"] == "Backup floor"
    assert backup["packs"][0]["signature"]["key"] == next(iter(keys))

    # a tampered pack and an unsigned one are skipped on restore, the good one comes back
    tampered = json.loads(json.dumps(backup["packs"][0]))
    tampered["id"] = tampered["source"]["id"] = "test.tampered"
    tampered["source"]["name"] = "Changed"
    unsigned = {k: v for k, v in backup["packs"][0].items() if k != "signature"}
    unsigned["id"] = "test.unsigned"
    backup["building"]["floors"][0]["name"] = "Restored floor"
    restore = {"type": "axonometra/backup/import", "building": backup["building"]}
    await client.send_json_auto_id({**restore, "packs": [*backup["packs"], tampered, unsigned]})
    result = await client.receive_json()
    assert result["success"], result
    assert result["result"]["packs"] == 1
    assert sorted(s["id"] for s in result["result"]["skipped"]) == ["test.tampered", "test.unsigned"]
    assert result["result"]["building"]["floors"][0]["name"] == "Restored floor"

    await client.send_json_auto_id({"type": "axonometra/packs/list"})
    listed = (await client.receive_json())["result"]["packs"]
    assert [p["id"] for p in listed] == ["test.backup"]

    # a broken building is refused before anything changes
    await client.send_json_auto_id({"type": "axonometra/backup/import", "building": {"version": 99}, "packs": []})
    result = await client.receive_json()
    assert not result["success"] and result["error"]["code"] == "invalid_format"
