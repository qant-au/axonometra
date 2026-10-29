"""Config flow for Axonometra (no options: everything is set up in the panel)."""

from __future__ import annotations

from typing import Any

from homeassistant.config_entries import ConfigFlow, ConfigFlowResult

from .const import DOMAIN, PANEL_TITLE


class FloorplanConfigFlow(ConfigFlow, domain=DOMAIN):
    """Single-step flow."""

    VERSION = 1

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        """Confirm and create the entry."""
        if user_input is not None:
            return self.async_create_entry(title=PANEL_TITLE, data={})
        return self.async_show_form(step_id="user")
