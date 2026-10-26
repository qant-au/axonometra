"""The dashboard card as a Lovelace resource.

The main bundle is also loaded as an extra frontend module, but in the companion app a dashboard may be drawn
before that module has arrived; the card then stays "Custom element doesn't exist: accurona-card" until the
sidebar page is opened (#252). Lovelace waits for its resources before it draws cards, so the card's bundle is
kept in the resource list as well, in storage mode only (YAML resources belong to the user).

While Home Assistant starts, a dashboard (a wall tablet reloading itself) may ask for the bundle before it is
there and keep "Configuration error" until the next reload (#461). The resource is therefore a small loader that
loads the bundle and tries again every few seconds while it is not there yet. It is served from the integration's
own path (registered in async_setup, as early as possible); nothing is written into the user's `www` folder; a
loader that older versions left in `www/accurona/` is removed.
"""

from __future__ import annotations

import contextlib
import logging
from pathlib import Path
from typing import Any

from homeassistant.const import EVENT_HOMEASSISTANT_STARTED
from homeassistant.core import CoreState, Event, HomeAssistant

from .const import MAIN_BUNDLE, URL_BASE

_LOGGER = logging.getLogger(__name__)

LOADER_DIR = "accurona"
LOADER_FILE = "accurona-loader.js"
LOADER_URL = f"{URL_BASE}/{LOADER_FILE}"
# where versions before 1.23 put the loader (in the user's www folder): cleaned up
OLD_LOADER_URL = f"/local/{LOADER_DIR}/{LOADER_FILE}"

# tries every 5 s for 15 minutes; the first try is awaited, so a dashboard normally waits for the card as before
_LOADER = """// Accurona: loads the dashboard card. Served from the integration's own path, never written to disk.
// While Home Assistant is still starting, the card's script is not served yet: then it tries again (#461).
const url = "{url}";
const tag = "accurona-card";
const load = async (n) => {{
  try {{
    await import(n ? `${{url}}&retry=${{n}}` : url);
  }} catch (err) {{
    // not there yet
  }}
}};
await load(0);
(async () => {{
  for (let n = 1; n <= 180 && !customElements.get(tag); n++) {{
    await new Promise((done) => setTimeout(done, 5000));
    if (!customElements.get(tag)) await load(n);
  }}
}})();
"""


def loader_source(bundle_url: str) -> str:
    """The loader for the bundle at this URL."""
    return _LOADER.format(url=bundle_url.replace("\\", "").replace('"', ""))


def remove_loader(www: Path) -> None:
    """Takes a loader older versions wrote into www (and its folder, when empty) away again."""
    folder = www / LOADER_DIR
    (folder / LOADER_FILE).unlink(missing_ok=True)
    with contextlib.suppress(OSError):
        folder.rmdir()


def _resources(hass: HomeAssistant) -> Any | None:
    """Lovelace's resource collection when it can be changed (storage mode), else None."""
    data = hass.data.get("lovelace")
    if data is None:
        return None
    # since 2025.2 a LovelaceData object, before a dict
    resources = data.get("resources") if isinstance(data, dict) else getattr(data, "resources", None)
    if resources is None or not hasattr(resources, "async_create_item"):
        return None
    return resources


def _is_ours(url: str) -> bool:
    """A resource that loads our main bundle: ours, our loader, or an older copy (another path, an old hand install)."""
    path = url.split("?")[0]
    return path.endswith(f"/{MAIN_BUNDLE}") or path.endswith(f"/{LOADER_FILE}")


async def async_ensure_card_resource(hass: HomeAssistant, url: str) -> None:
    """Keep exactly our current bundle URL in the dashboard resources (added once, updated after an update)."""
    resources = _resources(hass)
    if resources is None:
        return
    try:
        await resources.async_get_info()  # loads the collection
        ours = [item for item in resources.async_items() if _is_ours(str(item.get("url", "")))]
        if not ours:
            await resources.async_create_item({"res_type": "module", "url": url})
            _LOGGER.debug("Added the dashboard card resource %s", url)
            return
        for item in ours:
            if item.get("url") != url:
                # an older version or an old copy of the bundle: it would define the card first, so it points to ours
                await resources.async_update_item(item["id"], {"res_type": "module", "url": url})
                _LOGGER.debug("Updated dashboard resource %s to %s", item.get("url"), url)
    except Exception:  # the card still loads as an extra module, this is only a help
        _LOGGER.debug("Could not update the dashboard resources", exc_info=True)


def async_schedule_card_resource(hass: HomeAssistant, url: str) -> None:
    """Run once Home Assistant has started (Lovelace and its resources are set up by then)."""
    if hass.state is CoreState.running:
        hass.async_create_task(async_ensure_card_resource(hass, url))
        return

    async def _started(_event: Event) -> None:
        await async_ensure_card_resource(hass, url)

    hass.bus.async_listen_once(EVENT_HOMEASSISTANT_STARTED, _started)


async def async_remove_card_resource(hass: HomeAssistant) -> None:
    """When the integration is removed: drop the resources that point to our own static path or our loader."""
    resources = _resources(hass)
    if resources is None:
        return
    try:
        await resources.async_get_info()
        for item in list(resources.async_items()):
            url = str(item.get("url", ""))
            if url.startswith(f"{URL_BASE}/") or url.split("?")[0] == OLD_LOADER_URL:
                await resources.async_delete_item(item["id"])
    except Exception:
        _LOGGER.debug("Could not remove the dashboard resource", exc_info=True)
