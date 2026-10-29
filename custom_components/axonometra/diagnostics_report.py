"""Opt-in "help improve Axonometra" reports: anonymous usage counts and error messages.

Nothing is sent unless the user switched it on in the editor (off by default). Then one report a day
(and at most one error batch an hour) goes to the Axonometra server: versions, the language, the ids of
installed Mastershort packs, the active Pro features, counts of the plan (no names, no geometry), the
kinds of devices the plan is shown on (device class, browser, OS, frame rate) and scrubbed error
messages of our own bundles. The id is random, made when the user switches it on; it is not Home
Assistant's instance id and is forgotten when the user switches off or deletes the data.

Not to be confused with Home Assistant's own diagnostics platform (diagnostics.py), which this
integration does not have.
"""

from __future__ import annotations

import asyncio
from collections.abc import Iterable, Mapping
from datetime import timedelta
import logging
import re
import sys
import time
from typing import Any
import uuid

import aiohttp
from homeassistant.const import __version__ as HA_VERSION
from homeassistant.core import HomeAssistant
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.event import async_track_time_interval
from homeassistant.helpers.storage import Store
from homeassistant.loader import async_get_integration

from .const import DOMAIN, STORAGE_KEY_DIAGNOSTICS, STORAGE_VERSION
from .license import RETRY_WAITS, user_agent
from .packs import KNOWN_FEATURES

_LOGGER = logging.getLogger(__name__)

TELEMETRY_API = "https://api.mastershort.de/telemetry/v1"
PAYLOAD_VERSION = 1
DAILY_INTERVAL = 24 * 3600
ERROR_INTERVAL = 3600
# a failed send waits this long before the next try
RETRY_AFTER_FAILURE = 3600
TICK = timedelta(minutes=10)
MAX_CLIENTS = 10
MAX_ERRORS = 20
MAX_MESSAGE = 200
MAX_FORMER_IDS = 5
# what the frontend may name: device classes, GPU tiers and views
DEVICES = ("tablet", "phone", "desktop")
GPU_TIERS = ("low", "mid", "high")
_VIEW = re.compile(r"^[a-z0-9_]{1,20}$")
# browser and OS: a name and a major version, nothing else
_LABEL = re.compile(r"^[A-Za-z0-9 ._-]{1,40}$")
_WHERE = re.compile(r"^axonometra[\w-]*\.js(:\d+){0,2}$")
_VERSION = re.compile(r"^[0-9A-Za-z.+-]{1,20}$")
_TIMEOUT = aiohttp.ClientTimeout(total=30)
_SAVE_DELAY = 120

# ---------------------------------------------------------------------------- scrubbing

# Home Assistant domains whose "domain.object_id" is an entity id (other dotted words in an error are
# mostly code, such as "this.viewer"; one with an underscore in the object id is treated as an entity too)
_HA_DOMAINS = (
    "alarm_control_panel|automation|binary_sensor|button|calendar|camera|climate|counter|cover|date|datetime|"
    "device_tracker|event|fan|group|humidifier|image|input_boolean|input_button|input_datetime|input_number|"
    "input_select|input_text|lawn_mower|light|lock|media_player|notify|number|person|remote|scene|script|select|"
    "sensor|siren|sun|switch|text|time|timer|todo|update|vacuum|valve|water_heater|weather|zone"
)
_SCRUB: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r"\b(?:https?|wss?|file|blob|data|ftp):[^\s'\"<>)\]]*", re.IGNORECASE), "<url>"),
    (re.compile(r"\beyJ[\w-]+\.[\w-]+\.[\w-]+"), "<token>"),
    (re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+"), "<email>"),
    (re.compile(r"\b\d{1,3}(?:\.\d{1,3}){3}(?::\d+)?\b"), "<ip>"),
    (re.compile(r"\b[0-9a-f]{1,4}(?::[0-9a-f]{0,4}){2,7}\b", re.IGNORECASE), "<ip>"),
    (re.compile(rf"\b(?:{_HA_DOMAINS})\.[a-z0-9_]+\b"), "<entity>"),
    (re.compile(r"\b[a-z][a-z0-9_]*\.[a-z0-9]*_[a-z0-9_]*\b"), "<entity>"),
    (re.compile(r"\b[0-9a-f]{16,}\b", re.IGNORECASE), "<id>"),
)


def scrub(text: Any) -> str:
    """An error message without anything that may point at the user: URLs, tokens, e-mail and IP
    addresses, entity ids and long hex ids; at most MAX_MESSAGE characters."""
    out = str(text or "")
    for pattern, repl in _SCRUB:
        out = pattern.sub(repl, out)
    out = re.sub(r"\s+", " ", out).strip()
    return out[:MAX_MESSAGE]


# ---------------------------------------------------------------------------- aggregates


def _label(value: Any) -> str:
    text = str(value or "").strip()
    return text if _LABEL.match(text) else "other"


def clean_client(raw: Mapping[str, Any]) -> dict[str, Any]:
    """One client's aggregate as the frontend sent it, reduced to the allowed fields and values."""
    device = raw.get("device") if raw.get("device") in DEVICES else "desktop"
    fps = raw.get("fps")
    scale = raw.get("render_scale")
    raw_views = raw.get("views")
    views: Mapping[Any, Any] = raw_views if isinstance(raw_views, Mapping) else {}
    return {
        "device": device,
        "browser": _label(raw.get("browser")),
        "os": _label(raw.get("os")),
        "low_end": raw.get("low_end") if isinstance(raw.get("low_end"), bool) else None,
        "render_scale": round(float(scale), 2) if isinstance(scale, int | float) and 0 < scale <= 4 else None,
        "fps": round(float(fps), 1) if isinstance(fps, int | float) and 0 < fps <= 1000 else None,
        "fps_n": int(raw.get("fps_n") or 0) if isinstance(raw.get("fps_n"), int) and raw["fps_n"] > 0 else 0,
        "gpu_tier": raw.get("gpu_tier") if raw.get("gpu_tier") in GPU_TIERS else None,
        "views": {
            k: int(v)
            for k, v in list(views.items())[:20]
            if isinstance(k, str) and _VIEW.match(k) and isinstance(v, int) and 0 < v < 100_000
        },
    }


def merge_client(clients: list[dict[str, Any]], raw: Mapping[str, Any]) -> list[dict[str, Any]]:
    """Add a client's aggregate to the day's list: one entry per device class, browser and OS (at most
    MAX_CLIENTS), views summed, frame rates averaged over their samples."""
    new = clean_client(raw)
    key = (new["device"], new["browser"], new["os"])
    out = [dict(c, views=dict(c.get("views", {}))) for c in clients]
    match = next((c for c in out if (c["device"], c["browser"], c["os"]) == key), None)
    if match is None:
        if len(out) < MAX_CLIENTS:
            out.append(new)
        return out
    for field in ("low_end", "render_scale", "gpu_tier"):
        if new[field] is not None:
            match[field] = new[field]
    if new["fps"] is not None and new["fps_n"]:
        n_old = int(match.get("fps_n") or 0) if match.get("fps") is not None else 0
        total = n_old + new["fps_n"]
        match["fps"] = round(((match.get("fps") or 0) * n_old + new["fps"] * new["fps_n"]) / total, 1)
        match["fps_n"] = total
    for view, count in new["views"].items():
        if view in match["views"] or len(match["views"]) < 20:
            match["views"][view] = match["views"].get(view, 0) + count
    return out


def clean_error(raw: Mapping[str, Any]) -> dict[str, Any] | None:
    """One error as the frontend sent it, scrubbed again here; None when it is not ours or empty."""
    msg = scrub(raw.get("msg"))
    where = str(raw.get("where") or "")
    if not msg or not _WHERE.match(where):
        return None
    version = str(raw.get("version") or "")
    count = raw.get("count")
    return {
        "msg": msg,
        "where": where,
        "count": max(1, min(int(count), 10_000)) if isinstance(count, int) else 1,
        "version": version if _VERSION.match(version) else "unknown",
    }


def merge_errors(errors: list[dict[str, Any]], raws: Iterable[Mapping[str, Any]]) -> list[dict[str, Any]]:
    """Add errors to the list: the same message at the same place counts up; at most MAX_ERRORS."""
    out = [dict(e) for e in errors]
    for raw in raws:
        err = clean_error(raw)
        if err is None:
            continue
        key = (err["msg"], err["where"], err["version"])
        match = next((e for e in out if (e["msg"], e["where"], e["version"]) == key), None)
        if match is not None:
            match["count"] = min(match["count"] + err["count"], 1_000_000)
        elif len(out) < MAX_ERRORS:
            out.append(err)
    return out


# ---------------------------------------------------------------------------- payload


def plan_counts(building: Mapping[str, Any]) -> dict[str, int]:
    """How big the plan is, as counts only."""
    floors = building.get("floors") or []
    placements = [p for f in floors for p in f.get("placements") or []]
    return {
        "floors": len(floors),
        "rooms": sum(len(f.get("rooms") or []) for f in floors),
        "furniture": sum(len(f.get("furniture") or []) for f in floors),
        "devices_linked": len(placements),
        "outdoor": sum(len(f.get("outdoor") or []) for f in floors),
        "cameras": sum(1 for p in placements if str(p.get("entity_id") or "").startswith("camera.")),
    }


def pack_ids(packs: Iterable[Mapping[str, Any]]) -> list[str]:
    """Ids of the installed Mastershort packs (a customer's own studio furniture is left out)."""
    return sorted({str(p.get("id")) for p in packs if str(p.get("id") or "").startswith("mastershort.")})


def pro_features(packs: Iterable[Mapping[str, Any]]) -> list[str]:
    """The Pro features the installed packs unlock."""
    return sorted({f for p in packs for f in p.get("features") or [] if f in KNOWN_FEATURES})


def build_payload(
    state: Mapping[str, Any],
    *,
    kind: str,
    building: Mapping[str, Any],
    packs: Iterable[Mapping[str, Any]],
    axonometra: str,
    ha: str,
    lang: str | None,
) -> dict[str, Any]:
    """The report exactly as it is sent. `kind` "daily" carries the day's clients, "errors" only the errors."""
    packs = list(packs)
    clients = [{k: v for k, v in c.items() if k != "fps_n"} for c in state.get("clients") or []]
    return {
        "v": PAYLOAD_VERSION,
        "id": state.get("id"),
        "kind": kind,
        "axonometra": axonometra,
        "ha": ha,
        "python": f"{sys.version_info.major}.{sys.version_info.minor}",
        "lang": (lang or "en").split("-")[0][:5].lower(),
        "packs": pack_ids(packs),
        "pro": pro_features(packs),
        "plan": plan_counts(building),
        "clients": clients if kind == "daily" else [],
        "errors": [dict(e) for e in state.get("errors") or []],
    }


def _empty_state() -> dict[str, Any]:
    return {
        "enabled": False,
        "id": None,
        "last_daily": None,
        "last_errors": None,
        "failed_at": None,
        # whether a report went out under this id, and ids of earlier switch-ons that sent something
        "sent": False,
        "former_ids": [],
        "clients": [],
        "errors": [],
    }


class DiagnosticsReporter:
    """The setting, the random id, the day's aggregates and the sender."""

    def __init__(self, hass: HomeAssistant, data: Any) -> None:
        """Keep Home Assistant and the plan's data (FloorplanData: building and packs)."""
        self.hass = hass
        self.data = data
        self.state: dict[str, Any] = _empty_state()
        self._store: Store[dict[str, Any]] = Store(hass, STORAGE_VERSION, STORAGE_KEY_DIAGNOSTICS)
        self._version = "dev"
        self._sending = False

    @property
    def enabled(self) -> bool:
        """Whether the user switched the reports on."""
        return bool(self.state.get("enabled"))

    async def async_load(self) -> None:
        """Load the stored state and our version."""
        stored = await self._store.async_load()
        if isinstance(stored, dict):
            self.state = {**_empty_state(), **stored}
        try:
            self._version = str((await async_get_integration(self.hass, DOMAIN)).version or "dev")
        except Exception:
            self._version = "dev"

    def start(self) -> Any:
        """Check every TICK whether a report is due; returns the function that stops it."""

        async def _tick(_now: Any) -> None:
            await self.async_tick()

        return async_track_time_interval(self.hass, _tick, TICK)

    def payload(self, kind: str = "daily") -> dict[str, Any]:
        """What would be sent now."""
        return build_payload(
            self.state,
            kind=kind,
            building=self.data.building,
            packs=self.data.packs,
            axonometra=self._version,
            ha=HA_VERSION,
            lang=self.hass.config.language,
        )

    def status(self) -> dict[str, Any]:
        """The setting and the exact next daily report, for the editor."""
        return {
            "enabled": self.enabled,
            "last_daily": self.state.get("last_daily"),
            "can_delete": bool(self._sent_ids()),
            "preview": self.payload("daily"),
            "endpoint": f"{TELEMETRY_API}/report",
        }

    def _save(self) -> None:
        self._store.async_delay_save(lambda: self.state, _SAVE_DELAY)

    def _sent_ids(self) -> list[str]:
        """Ids under which reports went to the server and were not deleted yet (the current one first)."""
        current = [self.state["id"]] if self.state.get("id") and self.state.get("sent") else []
        return current + [i for i in self.state.get("former_ids") or [] if i not in current]

    async def async_set_enabled(self, on: bool) -> None:
        """Switch on (with a new random id; the first report goes a day later, a first error batch an
        hour later) or off (nothing is sent any more and the collected data is dropped; an id that sent
        something is only kept so that "delete my data" can still reach its reports)."""
        if on == self.enabled:
            return
        state = _empty_state()
        state["former_ids"] = self._sent_ids()[:MAX_FORMER_IDS]
        if on:
            now = time.time()
            state.update(enabled=True, id=str(uuid.uuid4()), last_daily=now, last_errors=now)
        self.state = state
        await self._store.async_save(self.state)

    def add_client(self, client: Mapping[str, Any] | None, errors: Iterable[Mapping[str, Any]] | None) -> None:
        """Take a frontend's aggregate and errors (ignored while switched off)."""
        if not self.enabled:
            return
        if client:
            self.state["clients"] = merge_client(self.state.get("clients") or [], client)
        if errors:
            self.state["errors"] = merge_errors(self.state.get("errors") or [], errors)
        self._save()

    async def async_delete(self) -> None:
        """Ask the server to delete everything sent under our ids, then forget them and switch off.
        Raises DiagnosticsError when the server could not be reached (the ids not deleted yet are kept
        for another try)."""
        left = [report_id for report_id in self._sent_ids() if not await self._post("delete", {"id": report_id})]
        self.state = _empty_state()
        self.state["former_ids"] = left
        await self._store.async_save(self.state)
        if left:
            raise DiagnosticsError("unreachable")

    async def async_tick(self, now: float | None = None) -> None:
        """Send the daily report or an error batch when one is due. Never runs while switched off."""
        if not self.enabled or self._sending:
            return
        now = time.time() if now is None else now
        failed_at = self.state.get("failed_at")
        if failed_at and now - failed_at < RETRY_AFTER_FAILURE:
            return
        if now - (self.state.get("last_daily") or 0) >= DAILY_INTERVAL:
            kind = "daily"
        elif self.state.get("errors") and now - (self.state.get("last_errors") or 0) >= ERROR_INTERVAL:
            kind = "errors"
        else:
            return
        self._sending = True
        try:
            payload = self.payload(kind)
            if not await self._post("report", payload):
                self.state["failed_at"] = now
            else:
                self.state["failed_at"] = None
                self.state["sent"] = True
                # whatever came in while sending stays for the next report
                sent = {(e["msg"], e["where"], e["version"]) for e in payload["errors"]}
                self.state["errors"] = [
                    e for e in self.state.get("errors") or [] if (e["msg"], e["where"], e["version"]) not in sent
                ]
                self.state["last_errors"] = now
                if kind == "daily":
                    self.state["clients"] = []
                    self.state["last_daily"] = now
            self._save()
        finally:
            self._sending = False

    async def _post(self, path: str, body: dict[str, Any]) -> bool:
        """One request to the Axonometra server; True on success. Failures are only logged for debugging."""
        session = async_get_clientsession(self.hass)
        headers = {"User-Agent": await user_agent(self.hass)}
        attempt = 0
        try:
            while True:
                async with session.post(f"{TELEMETRY_API}/{path}", json=body, headers=headers, timeout=_TIMEOUT) as res:
                    if res.status == 429 and attempt < len(RETRY_WAITS):
                        await asyncio.sleep(RETRY_WAITS[attempt])
                        attempt += 1
                        continue
                    if res.status >= 400:
                        _LOGGER.debug("Diagnostics %s answered HTTP %s", path, res.status)
                        return False
                    return True
        except (TimeoutError, aiohttp.ClientError, OSError) as err:
            _LOGGER.debug("Diagnostics %s failed: %s", path, err)
            return False


class DiagnosticsError(Exception):
    """The server could not be reached."""

    def __init__(self, code: str) -> None:
        """Keep the reason."""
        super().__init__(code)
        self.code = code
