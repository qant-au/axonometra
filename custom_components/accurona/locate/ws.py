"""Websocket commands of the locating feature."""

from __future__ import annotations

from typing import Any

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.dispatcher import async_dispatcher_connect
import voluptuous as vol

from .answers import async_locate
from .service import DATA_LOCATE, SIGNAL_LOCATE, LocateService, quality

_ID = vol.All(str, vol.Length(min=1, max=64))


def _service(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> LocateService | None:
    service: LocateService | None = hass.data.get(DATA_LOCATE)
    if service is None:
        connection.send_error(msg["id"], "not_loaded", "Accurona is not set up")
    return service


@websocket_api.websocket_command({vol.Required("type"): "accurona/locate/config"})
@websocket_api.require_admin
@callback
def ws_locate_config(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    if (service := _service(hass, connection, msg)) is not None:
        connection.send_result(msg["id"], service.config())


@websocket_api.websocket_command(
    {
        vol.Required("type"): "accurona/locate/configure",
        vol.Optional("enabled"): bool,
        vol.Optional("admins_only"): bool,
        vol.Optional("fly"): bool,
        vol.Optional("devices"): [dict],
        vol.Optional("scanner_rooms"): {str: vol.Any(None, str)},
        vol.Optional("rooms"): [dict],
        vol.Optional("doors"): [vol.All([_ID], vol.Length(min=2, max=2))],
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def ws_locate_configure(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    if (service := _service(hass, connection, msg)) is None:
        return
    await service.async_configure({k: v for k, v in msg.items() if k not in ("id", "type")})
    connection.send_result(msg["id"], service.config())


@websocket_api.websocket_command({vol.Required("type"): "accurona/locate/nearby"})
@websocket_api.require_admin
@callback
def ws_locate_nearby(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    if (service := _service(hass, connection, msg)) is not None:
        connection.send_result(msg["id"], {"devices": service.watch_nearby()})


@websocket_api.websocket_command(
    {
        vol.Required("type"): "accurona/locate/calibrate",
        vol.Required("action"): vol.In(["start", "stop", "clear", "status"]),
        vol.Optional("room"): vol.Any(None, _ID),
        vol.Optional("devices", default=[]): [_ID],
        vol.Optional("seconds", default=90): vol.All(int, vol.Range(min=10, max=600)),
    }
)
@websocket_api.require_admin
@callback
def ws_locate_calibrate(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    if (service := _service(hass, connection, msg)) is None:
        return
    action = msg["action"]
    if action == "start":
        if not msg.get("room"):
            connection.send_error(msg["id"], "invalid", "room missing")
            return
        try:
            service.calibrate_start(msg["room"], msg["devices"] or [d["id"] for d in service.devices], msg["seconds"])
        except ValueError:
            connection.send_error(msg["id"], "no_devices", "no tracked device to learn with")
            return
    elif action == "stop":
        service.calibrate_stop()
    elif action == "clear":
        service.calibrate_clear(msg.get("room"))
    connection.send_result(
        msg["id"],
        {
            "calibration": service.calibration_status(),
            "samples": {
                dev: {room: len(v) for room, v in fp.samples.items()} for dev, fp in service.fingerprints.items()
            },
        },
    )


@websocket_api.websocket_command({vol.Required("type"): "accurona/locate/quality"})
@websocket_api.require_admin
@websocket_api.async_response
async def ws_locate_quality(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    if (service := _service(hass, connection, msg)) is None:
        return
    samples = {dev: {r: list(v) for r, v in fp.samples.items()} for dev, fp in service.fingerprints.items()}
    connection.send_result(msg["id"], await hass.async_add_executor_job(quality, samples))


@websocket_api.websocket_command({vol.Required("type"): "accurona/locate/subscribe"})
@callback
def ws_locate_subscribe(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    """Where everyone is, now and on every change. With "admins only", other users get an empty list."""
    if (service := _service(hass, connection, msg)) is None:
        return

    def payload() -> dict[str, Any]:
        if service.admins_only and not connection.user.is_admin:
            return {"running": service.running, "devices": [], "calibration": None}
        return service.snapshot()

    @callback
    def forward() -> None:
        connection.send_message(websocket_api.event_message(msg["id"], payload()))

    connection.subscriptions[msg["id"]] = async_dispatcher_connect(hass, SIGNAL_LOCATE, forward)
    connection.send_result(msg["id"])
    forward()


@websocket_api.websocket_command(
    {
        vol.Required("type"): "accurona/locate/ask",
        vol.Required("text"): vol.All(str, vol.Length(max=300)),
        vol.Optional("language"): vol.All(str, vol.Length(max=10)),
    }
)
@websocket_api.async_response
async def ws_locate_ask(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    """A sentence said at a Accurona view: the locating answer ("Wer ist zu Hause?") with the rooms to fly to, or
    null when it is no locating question (the view's own answers come next). The same answer Assist gets."""
    service: LocateService | None = hass.data.get(DATA_LOCATE)
    language = (msg.get("language") or hass.config.language or "en").split("-")[0]
    located = await async_locate(hass, service, msg["text"], language, connection.user.id)
    if located is None or service is None:
        connection.send_result(msg["id"], None)
        return
    connection.send_result(
        msg["id"],
        {
            "text": located.text,
            "rooms": located.rooms if service.fly else [],
            "admins_only": located.persons and service.admins_only,
        },
    )


COMMANDS = (
    ws_locate_ask,
    ws_locate_config,
    ws_locate_configure,
    ws_locate_nearby,
    ws_locate_calibrate,
    ws_locate_quality,
    ws_locate_subscribe,
)
