"""Which tracked device an advertisement belongs to: an iPhone or Apple Watch by its IRK (the address rotates), an
iBeacon (the Home Assistant Android app's BLE transmitter, beacon tags) by UUID/major/minor, anything else by its
fixed address."""

from __future__ import annotations

import binascii
from typing import Any

APPLE = 0x004C


def ibeacon_key(adv: Any) -> str | None:
    """uuid+major+minor as hex, or None when the advertisement is no iBeacon."""
    payload = (adv.manufacturer_data or {}).get(APPLE)
    if payload and len(payload) >= 22 and payload[0] == 0x02 and payload[1] == 0x15:
        return payload[2:22].hex()
    return None


class Identity:
    """Resolves addresses to tracked device ids; IRK matches are cached per address (they rotate ~15 min)."""

    def __init__(self, devices: list[dict[str, Any]]) -> None:
        self.by_address: dict[str, str] = {}
        self.by_beacon: dict[str, str] = {}
        self.ciphers: list[tuple[str, Any]] = []
        self._cache: dict[str, str | None] = {}
        cipher_for: Any = None
        try:
            from bluetooth_data_tools import get_cipher_for_irk

            cipher_for = get_cipher_for_irk
        except ImportError:  # pragma: no cover - always there with Home Assistant's Bluetooth
            pass
        for device in devices:
            kind, key, dev_id = device.get("kind"), str(device.get("key", "")), device["id"]
            if kind == "mac":
                self.by_address[key.upper()] = dev_id
            elif kind == "ibeacon":
                self.by_beacon[key.lower()] = dev_id
            elif kind == "irk" and cipher_for is not None:
                try:
                    irk = binascii.unhexlify(key)
                except (ValueError, binascii.Error):
                    continue
                if len(irk) != 16:
                    continue
                # some read-out tools show the key in reversed byte order: both are tried
                self.ciphers.append((dev_id, cipher_for(irk)))
                self.ciphers.append((dev_id, cipher_for(irk[::-1])))

    def resolve(self, address: str, adv: Any) -> str | None:
        if (dev := self.by_address.get(address)) is not None:
            return dev
        if self.by_beacon and (beacon := ibeacon_key(adv)) and (dev := self.by_beacon.get(beacon)):
            return dev
        if not self.ciphers:
            return None
        if address in self._cache:
            return self._cache[address]
        # only resolvable private addresses (top bits 01) can match an IRK
        found = None
        if int(address[:2], 16) >> 6 == 0b01:
            from bluetooth_data_tools import resolve_private_address

            for dev_id, cipher in self.ciphers:
                if resolve_private_address(cipher, address):
                    found = dev_id
                    break
        if len(self._cache) > 5000:
            self._cache.clear()
        self._cache[address] = found
        return found
