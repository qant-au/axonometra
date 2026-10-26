"""Persistence for Accurona.

The building (rooms, walls, furniture, placements) and the background images live in separate
stores so frequent saves from the editor never rewrite the large image data.
"""

from __future__ import annotations

import inspect
import logging
import time
from typing import Any
import uuid

from homeassistant.core import HomeAssistant
from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.helpers.storage import Store
import voluptuous as vol

from .const import (
    DOMAIN,
    HISTORY_INTERVAL,
    HISTORY_MAX,
    LEGACY_DOMAIN,
    SIGNAL_BUILDING_UPDATED,
    STORAGE_KEY_BUILDING,
    STORAGE_KEY_HISTORY,
    STORAGE_KEY_IMAGES,
    STORAGE_KEY_LICENSE,
    STORAGE_KEY_PACKS,
    STORAGE_MINOR_VERSION,
    STORAGE_VERSION,
)
from .packs import module_sha
from .schema import BUILDING_SCHEMA, empty_building, image_ids

_LOGGER = logging.getLogger(__name__)


def complete(building: dict[str, Any]) -> dict[str, Any]:
    """Fill fields added in later versions with their defaults (keeps the building when it is invalid)."""
    try:
        return BUILDING_SCHEMA(building)
    except vol.Invalid as err:
        _LOGGER.warning("Stored building does not validate (%s); loading it unchanged", err)
        return building


class _BuildingStore(Store):
    """Building store with migrations between minor versions."""

    async def _async_migrate_func(self, old_major_version: int, old_minor_version: int, old_data: dict) -> dict:
        # 1 -> 2: newer optional fields (openings, furniture, energy, presence) get their defaults
        if old_minor_version < 2 and old_data.get("building"):
            old_data = {**old_data, "building": complete(old_data["building"])}
        return old_data


_STORE_KEYS = (STORAGE_KEY_BUILDING, STORAGE_KEY_IMAGES, STORAGE_KEY_HISTORY, STORAGE_KEY_PACKS)


async def async_migrate_legacy_stores(hass: HomeAssistant) -> None:
    """A renamed installation keeps its plan: the stores of the earlier name (floorplan_3d.*) are
    copied to the new keys once, before the stores load; existing new stores are left alone."""
    copied = []
    for key in _STORE_KEYS:
        if await Store[dict[str, Any]](hass, STORAGE_VERSION, key).async_load() is not None:
            continue
        old_key = key.replace(f"{DOMAIN}.", f"{LEGACY_DOMAIN}.", 1)
        old_store = (
            _BuildingStore(hass, STORAGE_VERSION, old_key, minor_version=STORAGE_MINOR_VERSION)
            if key == STORAGE_KEY_BUILDING
            else Store[dict[str, Any]](hass, STORAGE_VERSION, old_key)
        )
        data = await old_store.async_load()
        if data is None:
            continue
        await Store[dict[str, Any]](hass, STORAGE_VERSION, key, minor_version=STORAGE_MINOR_VERSION).async_save(data)
        copied.append(key)
    if copied:
        _LOGGER.info("Took over the data of %s: %s", LEGACY_DOMAIN, ", ".join(copied))


# newer Home Assistant turns a store's data into JSON in the event loop unless told otherwise; the background images
# and the restore points can be megabytes, so they are serialised in the executor (older versions always did that)
_OFF_LOOP: dict[str, Any] = {}
if "serialize_in_event_loop" in inspect.signature(Store.__init__).parameters:
    _OFF_LOOP["serialize_in_event_loop"] = False


def _stores(hass: HomeAssistant) -> tuple[Store, Store, Store, Store]:
    return (
        _BuildingStore(hass, STORAGE_VERSION, STORAGE_KEY_BUILDING, minor_version=STORAGE_MINOR_VERSION),
        Store(hass, STORAGE_VERSION, STORAGE_KEY_IMAGES, **_OFF_LOOP),
        Store(hass, STORAGE_VERSION, STORAGE_KEY_HISTORY, **_OFF_LOOP),
        Store(hass, STORAGE_VERSION, STORAGE_KEY_PACKS),
    )


def _summary(building: dict[str, Any]) -> dict[str, int]:
    floors = building.get("floors", [])
    return {
        "floors": len(floors),
        "rooms": sum(len(f.get("rooms", [])) for f in floors),
        "furniture": sum(len(f.get("furniture", [])) for f in floors),
    }


class FloorplanData:
    """Building and images of one installation."""

    def __init__(self, hass: HomeAssistant) -> None:
        """Initialise the stores."""
        self.hass = hass
        self._building_store, self._image_store, self._history_store, self._pack_store = _stores(hass)
        self._license_store: Store[dict[str, Any]] = Store(hass, STORAGE_VERSION, STORAGE_KEY_LICENSE)
        self.building: dict[str, Any] = empty_building()
        self.revision = 0
        self._images: dict[str, str] = {}
        self._history: list[dict[str, Any]] = []
        # imported furniture packs (checked payloads, see packs.py)
        self.packs: list[dict[str, Any]] = []
        # the shop connection (see license.py): key, licensee, catalog of bought packs, last check
        self.license: dict[str, Any] = {"key": None, "licensee": None, "catalog": [], "checked_at": None, "error": None}

    async def async_load(self) -> None:
        """Load both stores and drop images no floor refers to any more."""
        await async_migrate_legacy_stores(self.hass)
        stored = await self._building_store.async_load()
        if stored:
            self.building = complete(stored.get("building") or empty_building())
            self.revision = int(stored.get("revision", 0))
        packs = await self._pack_store.async_load()
        self.packs = list((packs or {}).get("packs", []))
        stored_license = await self._license_store.async_load()
        if stored_license:
            self.license = {**self.license, **stored_license}
        history = await self._history_store.async_load()
        self._history = list((history or {}).get("snapshots", []))
        images = await self._image_store.async_load()
        self._images = dict((images or {}).get("images", {}))
        unused = set(self._images) - image_ids(self.building)
        if unused:
            _LOGGER.debug("Removing %d unused background images", len(unused))
            for image_id in unused:
                self._images.pop(image_id)
            await self._save_images()

    async def async_save_building(self, building: dict[str, Any]) -> int:
        """Store a validated building, bump the revision and notify subscribers.

        The state before the save becomes a restore point when the last one is older than
        HISTORY_INTERVAL, so a long editing session leaves a trail without saving every step.
        """
        last = self._history[-1]["saved_at"] if self._history else 0
        if self.building.get("floors") and time.time() - last > HISTORY_INTERVAL:
            await self.async_snapshot()
        self.building = building
        self.revision += 1
        await self._building_store.async_save({"revision": self.revision, "building": building})
        async_dispatcher_send(self.hass, SIGNAL_BUILDING_UPDATED, self.revision)
        return self.revision

    async def async_snapshot(self) -> None:
        """Keep the current building as a restore point."""
        self._history.append(
            {
                "id": uuid.uuid4().hex[:12],
                "revision": self.revision,
                "saved_at": time.time(),
                "building": self.building,
            }
        )
        self._history = self._history[-HISTORY_MAX:]
        # copies: the JSON is written in the executor while the loop may change the originals
        await self._history_store.async_save({"snapshots": list(self._history)})

    def history(self) -> list[dict[str, Any]]:
        """Restore points, newest first, without their buildings."""
        return [
            {"id": h["id"], "revision": h["revision"], "saved_at": h["saved_at"], **_summary(h["building"])}
            for h in reversed(self._history)
        ]

    def snapshot(self, snapshot_id: str) -> dict[str, Any] | None:
        """Building of a restore point."""
        return next((h["building"] for h in self._history if h["id"] == snapshot_id), None)

    async def async_add_pack(
        self, payload: dict[str, Any], signed: tuple[dict[str, Any], dict[str, str]] | None = None
    ) -> bool:
        """Keep an imported pack; a newer file of the same pack replaces the old one. The payload as signed
        and the signature stay with it, so a backup can carry the pack and a restore can check it again.

        Module code runs only once an admin has approved it (`approved` holds the approved code's fingerprint).
        New module code for an installed module does not replace the running one: it waits beside it as
        `pending` until an admin approves it. Returns True when the pack waits for an admin's approval."""
        entry: dict[str, Any] = {**payload, "imported_at": time.time()}
        if signed:
            entry["source"], entry["signature"] = signed
        old = next((p for p in self.packs if p["id"] == payload["id"]), None)
        sha = module_sha(entry)
        if sha is not None and old is not None and module_sha(old) is not None:
            if sha == old.get("approved"):
                # the same code again (a re-import, a release with new furniture only): stays approved
                entry["approved"] = sha
            else:
                kept = {k: v for k, v in old.items() if k != "pending"}
                kept["pending"] = entry
                self.packs = [kept if p["id"] == payload["id"] else p for p in self.packs]
                await self._pack_store.async_save({"packs": self.packs})
                return True
        self.packs = [p for p in self.packs if p["id"] != payload["id"]] + [entry]
        await self._pack_store.async_save({"packs": self.packs})
        return sha is not None and entry.get("approved") != sha

    async def async_approve_module(self, pack_id: str, sha: str) -> bool:
        """An admin approved the module code with this fingerprint (the waiting update or the installed code)."""
        pack = next((p for p in self.packs if p["id"] == pack_id), None)
        if pack is None:
            return False
        pending = pack.get("pending")
        if isinstance(pending, dict) and module_sha(pending) == sha:
            approved = {**pending, "approved": sha}
        elif module_sha(pack) == sha:
            approved = {**{k: v for k, v in pack.items() if k != "pending"}, "approved": sha}
            if isinstance(pending, dict):
                approved["pending"] = pending
        else:
            return False
        self.packs = [approved if p["id"] == pack_id else p for p in self.packs]
        await self._pack_store.async_save({"packs": self.packs})
        return True

    @property
    def images(self) -> dict[str, str]:
        """All stored images (id -> data URL)."""
        return dict(self._images)

    async def async_restore(self, building: dict[str, Any], packs: list[dict[str, Any]]) -> int:
        """Replace the plan and the packs from a backup; the state before becomes a restore point."""
        await self.async_snapshot()
        self.packs = packs
        await self._pack_store.async_save({"packs": self.packs})
        return await self.async_save_building(building)

    async def async_save_license(self) -> None:
        """Keep the shop connection."""
        await self._license_store.async_save(self.license)

    async def async_remove_pack(self, pack_id: str) -> bool:
        """Remove a pack (furniture using it stays in the plan as plain boxes)."""
        kept = [p for p in self.packs if p["id"] != pack_id]
        if len(kept) == len(self.packs):
            return False
        self.packs = kept
        await self._pack_store.async_save({"packs": self.packs})
        return True

    def get_image(self, image_id: str) -> str | None:
        """Return an image as data URL."""
        return self._images.get(image_id)

    async def async_set_image(self, image_id: str, data: str) -> None:
        """Store an image."""
        self._images[image_id] = data
        await self._save_images()

    async def async_delete_image(self, image_id: str) -> None:
        """Remove an image."""
        if self._images.pop(image_id, None) is not None:
            await self._save_images()

    async def _save_images(self) -> None:
        await self._image_store.async_save({"images": dict(self._images)})
