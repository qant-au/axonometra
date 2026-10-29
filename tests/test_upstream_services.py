"""Axonometra: the author's online services are off, and then nothing reaches his servers."""

from __future__ import annotations

from unittest.mock import patch

from homeassistant.core import HomeAssistant
import pytest

from custom_components.axonometra import diagnostics_report, upstream
from custom_components.axonometra import license as lic


def test_off_by_default() -> None:
    """The switch ships off; turning it on is a decision taken with the author."""
    source = upstream.__file__
    with open(source, encoding="utf-8") as f:
        assert "\nUPSTREAM_SERVICES = False\n" in f.read()


async def test_shop_requests_are_refused_without_a_connection(
    hass: HomeAssistant, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Every shop call (licence, catalogue, pack download) goes through _post, which refuses before any network use."""
    monkeypatch.setattr(upstream, "UPSTREAM_SERVICES", False)
    with patch.object(lic, "async_get_clientsession") as session, pytest.raises(lic.LicenseError) as err:
        await lic.async_fetch_catalog(hass, "KEY", "instance")
    assert err.value.code == "upstream_disabled"
    session.assert_not_called()


async def test_usage_reports_are_never_sent(hass: HomeAssistant, monkeypatch: pytest.MonkeyPatch) -> None:
    """Usage reports, even when switched on by the user, are not posted to the author's server."""
    monkeypatch.setattr(upstream, "UPSTREAM_SERVICES", False)
    report = diagnostics_report.DiagnosticsReporter(hass, None)
    with patch.object(diagnostics_report, "async_get_clientsession") as session:
        assert await report._post("report", {}) is False
    session.assert_not_called()
