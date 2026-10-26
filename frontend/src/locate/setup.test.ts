import assert from "node:assert/strict";
import { test } from "node:test";
import { appTransmitters, irkHex } from "./setup.ts";
import type { HomeAssistant } from "../types.ts";

test("a pasted key: hex with or without separators, or Base64; anything else is no key", () => {
  assert.equal(irkHex("00112233445566778899AABBCCDDEEFF"), "00112233445566778899aabbccddeeff");
  assert.equal(irkHex("00:11:22:33:44:55:66:77:88:99:aa:bb:cc:dd:ee:ff"), "00112233445566778899aabbccddeeff");
  assert.equal(irkHex("ABEiM0RVZneImaq7zN3u/w=="), "00112233445566778899aabbccddeeff");
  assert.equal(irkHex("irk:00112233445566778899aabbccddeeff"), "00112233445566778899aabbccddeeff");
  assert.equal(irkHex("hello"), null);
  assert.equal(irkHex("0011"), null);
});

test("Android phones are found by the Home Assistant app's BLE Transmitter sensor, with their person and weak settings", () => {
  const hass = {
    language: "de",
    states: {
      "sensor.pixel_ble_transmitter": {
        entity_id: "sensor.pixel_ble_transmitter",
        state: "Transmitting",
        attributes: { id: "280fa872-f525-4bcc-b7b4-2c2843e023e0_100_40004", "Transmitting power": "ultraLow", "Advertise mode": "lowPower", friendly_name: "Pixel BLE Transmitter" },
      },
      "sensor.pixel_battery": { entity_id: "sensor.pixel_battery", state: "80", attributes: { id: "280fa872-f525-4bcc-b7b4-2c2843e023e0_1_1" } },
      "device_tracker.pixel": { entity_id: "device_tracker.pixel", state: "home", attributes: {} },
      "person.anna": { entity_id: "person.anna", state: "home", attributes: { device_trackers: ["device_tracker.pixel"] } },
    },
    entities: {
      "sensor.pixel_ble_transmitter": { entity_id: "sensor.pixel_ble_transmitter", device_id: "dev1" },
      "device_tracker.pixel": { entity_id: "device_tracker.pixel", device_id: "dev1" },
    },
    devices: { dev1: { id: "dev1", name: "Pixel 8", name_by_user: "Annas Pixel" } },
  } as unknown as HomeAssistant;
  const found = appTransmitters(hass);
  assert.equal(found.length, 1);
  // uuid + major 100 (0x0064) + minor 40004 (0x9c44): the key the backend reads from the advertisement
  assert.equal(found[0].key, "280fa872f5254bccb7b42c2843e023e0" + "0064" + "9c44");
  assert.equal(found[0].name, "Annas Pixel");
  assert.equal(found[0].person, "person.anna");
  assert.equal(found[0].power, "ultraLow");
  assert.equal(found[0].mode, "lowPower");
});
