"""Fixtures for Axonometra tests."""

from __future__ import annotations

from collections.abc import Generator
from unittest.mock import AsyncMock, patch

from homeassistant.core import HomeAssistant
import pytest


@pytest.fixture(autouse=True)
def auto_enable_custom_integrations(enable_custom_integrations):
    """Enable loading custom integrations in all tests."""
    return


@pytest.fixture(autouse=True)
def mock_frontend(hass: HomeAssistant) -> Generator[dict[str, object]]:
    """Stand in for the frontend and panel_custom components (hass_frontend is not installed in tests)."""
    hass.config.components.update({"frontend", "panel_custom"})
    with (
        patch("homeassistant.components.frontend.add_extra_js_url") as add_js,
        patch("homeassistant.components.frontend.remove_extra_js_url") as remove_js,
        patch("homeassistant.components.frontend.async_remove_panel") as remove_panel,
        patch("homeassistant.components.panel_custom.async_register_panel", new_callable=AsyncMock) as register,
    ):
        yield {"add_js": add_js, "remove_js": remove_js, "remove_panel": remove_panel, "register": register}
