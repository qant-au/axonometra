"""The card bundle is kept in the dashboard resources (#252)."""

from __future__ import annotations

from types import SimpleNamespace
from typing import Any

from custom_components.axonometra.card_resource import (
    LOADER_URL,
    async_ensure_card_resource,
    async_remove_card_resource,
    loader_source,
    remove_loader,
)


class FakeResources:
    """The parts of Lovelace's ResourceStorageCollection we use."""

    def __init__(self, items: list[dict[str, Any]]) -> None:
        self.items = items

    async def async_get_info(self) -> dict[str, int]:
        return {"resources": len(self.items)}

    def async_items(self) -> list[dict[str, Any]]:
        return self.items

    async def async_create_item(self, data: dict[str, Any]) -> dict[str, Any]:
        item = {"id": f"r{len(self.items)}", "type": data["res_type"], "url": data["url"]}
        self.items.append(item)
        return item

    async def async_update_item(self, item_id: str, updates: dict[str, Any]) -> dict[str, Any]:
        item = next(i for i in self.items if i["id"] == item_id)
        item.update({"type": updates["res_type"], "url": updates["url"]})
        return item

    async def async_delete_item(self, item_id: str) -> None:
        self.items = [i for i in self.items if i["id"] != item_id]


URL = "/axonometra_static/axonometra.js?v=1.12.4-abc"


async def test_added_updated_and_removed() -> None:
    """Added once, older copies point to the current bundle, other resources stay, removal takes only ours."""
    other = {"id": "x", "type": "module", "url": "/hacsfiles/button-card/button-card.js"}
    res = FakeResources([dict(other)])
    hass = SimpleNamespace(data={"lovelace": SimpleNamespace(resources=res)})
    await async_ensure_card_resource(hass, URL)
    assert [i["url"] for i in res.items] == [other["url"], URL]
    # an update and an old hand-installed copy: both lead to the current bundle, nothing is added twice
    res.items[1]["url"] = "/axonometra_static/axonometra.js?v=1.12.3-old"
    res.items.append({"id": "old", "type": "module", "url": "/local/axonometra.js"})
    await async_ensure_card_resource(hass, URL)
    assert [i["url"] for i in res.items] == [other["url"], URL, URL]
    await async_remove_card_resource(hass)
    assert res.items == [other]


async def test_yaml_mode_and_old_layout() -> None:
    """YAML resources are left alone; the dict layout before HA 2025.2 works too."""
    yaml = SimpleNamespace(loaded=True, async_items=lambda: [])
    await async_ensure_card_resource(SimpleNamespace(data={"lovelace": SimpleNamespace(resources=yaml)}), URL)
    res = FakeResources([])
    await async_ensure_card_resource(SimpleNamespace(data={"lovelace": {"resources": res}}), URL)
    assert [i["url"] for i in res.items] == [URL]


async def test_loader_resource_replaces_the_bundle_and_goes_on_removal() -> None:
    """The loader takes the bundle's place in the resources (#461) and is removed with the integration."""
    res = FakeResources([{"id": "a", "type": "module", "url": URL}])
    hass = SimpleNamespace(data={"lovelace": SimpleNamespace(resources=res)})
    loader = f"{LOADER_URL}?v=1.16.0-abc"
    await async_ensure_card_resource(hass, loader)
    assert [i["url"] for i in res.items] == [loader]
    await async_remove_card_resource(hass)
    assert res.items == []


def test_loader_file(tmp_path) -> None:
    """The loader imports the bundle, tries again while the card is missing, and is written and removed cleanly."""
    text = loader_source(URL)
    assert f'const url = "{URL}";' in text
    assert "customElements.get(tag)" in text
    # a loader that an older version left in www is removed, with its folder
    old = tmp_path / "axonometra" / "axonometra-loader.js"
    old.parent.mkdir()
    old.write_text(text, encoding="utf-8")
    remove_loader(tmp_path)
    assert not (tmp_path / "axonometra").exists()
    remove_loader(tmp_path)  # nothing there: no error
