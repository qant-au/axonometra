import assert from "node:assert/strict";
import { test } from "node:test";
import { canLift, clearFirstState, type Furniture } from "./model.ts";
import { isPackHeater, packRobotCentre, packRobotPart, packType, setPacks, type FurniturePack } from "./packs.ts";
import { hiddenInHa, isRelevant } from "./devices.ts";
import { pushFurniture, pushPackRobot } from "./viewer/furniture.ts";
import { GeoBuffer, LineBuffer } from "./viewer/geo.ts";

// a dock at the back, the robot (a disc with a bumper light) in front of it, like the Smart Home pack's model
const PACK: FurniturePack = {
  id: "t.home",
  name: "Home",
  publisher: "t",
  licensee: null,
  items: [
    {
      id: "robot_vacuum",
      name: { de: "Saugroboter mit Station", en: "Robot vacuum with dock" },
      size: [0.45, 0.75, 0.5],
      parts: [
        { shape: "box", x: 0, z: -0.2933, w: 0.8889, d: 0.4, y: 0, h: 1, color: "white", edges: true },
        { shape: "box", x: 0, z: -0.16, w: 0.7556, d: 0.1333, y: 0, h: 0.04, color: "dark" },
        { shape: "cyl", x: 0, z: 0.2267, w: 0.8, d: 0.48, y: 0, h: 0.18, color: "dark", edges: true },
        { shape: "cyl", x: 0, z: 0.2267, w: 0.2222, d: 0.1333, y: 0.18, h: 0.04, color: "metal" },
        { shape: "box", x: 0, z: 0.44, w: 0.1333, d: 0.0267, y: 0.14, h: 0.03, color: "accent" },
      ],
    },
    { id: "garage_light", name: { de: "Werkstattleuchte", en: "Workshop light" }, size: [1.5, 0.2, 0.12], mount: "ceiling", light: "panel", parts: [{ shape: "box", x: 0, z: 0, w: 1, d: 1, y: 0, h: 1, color: "white" }] },
    { id: "chandelier", name: { de: "Kronleuchter", en: "Chandelier" }, size: [0.6, 0.6, 0.5], mount: "ceiling", light: "pendant", parts: [{ shape: "box", x: 0, z: 0, w: 1, d: 1, y: 0, h: 1, color: "white" }] },
  ],
};

const vertices = (f: Furniture, still = false) => {
  const buf = new GeoBuffer();
  pushFurniture(buf, new LineBuffer(), new GeoBuffer(), f, 0, still);
  return buf.p.length / 3;
};

test("a pack's robot vacuum leaves its robot out of the dock's model and drives it as a model of its own (#645)", () => {
  setPacks([PACK]);
  const type = packType("t.home", "robot_vacuum");
  const item = PACK.items[0];
  assert.deepEqual(item.parts.map(packRobotPart), [false, false, true, true, true]);
  assert.ok(Math.abs(packRobotCentre(item) - 0.2267) < 1e-9);
  assert.equal(packRobotCentre(undefined), 0.227);
  const f: Furniture = { id: "f", type, x: 0, z: 0, rotation: 0, w: 0.45, d: 0.75, h: 0.5, variant: null, entity: null, power: null };
  // in the plan only the dock; a preview picture keeps the robot
  assert.ok(vertices(f) < vertices(f, true));
  const buf = new GeoBuffer();
  const { radius, top } = pushPackRobot(buf, item, 0.45, 0.75, 0.5);
  assert.ok(buf.p.length > 0);
  assert.ok(Math.abs(radius - 0.18) < 1e-6);
  assert.ok(Math.abs(top - 0.11) < 1e-6);
  // centred on the robot: its disc reaches as far behind the centre as in front of it
  let zMin = Infinity;
  for (let i = 2; i < buf.p.length; i += 3) zMin = Math.min(zMin, buf.p[i]);
  assert.ok(Math.abs(zMin + 0.18) < 0.02);
  setPacks([]);
});

test("a pack's flat ceiling light (the workshop light) gets a mount height, a pack chandelier does not (#645)", () => {
  setPacks([PACK]);
  assert.equal(canLift({ type: packType("t.home", "garage_light") }), true);
  assert.equal(canLift({ type: packType("t.home", "chandelier") }), false);
  setPacks([]);
});

test("a heat pump's indoor unit and other pack heaters take a water_heater entity (#645)", () => {
  setPacks([]);
  assert.equal(isPackHeater("pack:mastershort.utility:heat_pump_indoor"), true);
  assert.equal(isPackHeater("pack:mastershort.utility:buffer_tank"), true);
  assert.equal(isPackHeater("pack:mastershort.utility:heat_pump_out_s"), false);
  assert.equal(isPackHeater("water_heater"), false);
});

test("clearing the first state entity moves the second up instead of leaving it active unseen (#645)", () => {
  assert.deepEqual(clearFirstState({ state_entity2: "binary_sensor.b" }, "none"), { state_entity: "binary_sensor.b", state_entity2: null });
  assert.deepEqual(clearFirstState({ state_entity2: null }, "none"), { state_entity: null, state_entity2: null });
  assert.deepEqual(clearFirstState({ state_entity2: "binary_sensor.b" }, "binary_sensor.a"), { state_entity: "binary_sensor.a" });
});

test("entities hidden or disabled in Home Assistant are left out automatically (#645)", () => {
  const st = (id: string) => ({ entity_id: id, state: "on", attributes: {}, last_changed: "", last_updated: "", context: { id: "", user_id: null, parent_id: null } });
  const hass = {
    states: { "switch.a": st("switch.a"), "switch.b": st("switch.b"), "switch.c": st("switch.c"), "switch.d": st("switch.d") },
    entities: {
      "switch.a": { entity_id: "switch.a" },
      "switch.b": { entity_id: "switch.b", hidden: true },
      "switch.c": { entity_id: "switch.c", hidden_by: "user" },
      "switch.d": { entity_id: "switch.d", disabled_by: "integration" },
    },
  } as unknown as Parameters<typeof isRelevant>[0];
  assert.equal(hiddenInHa(hass, "switch.a"), false);
  assert.equal(isRelevant(hass, "switch.a"), true);
  for (const id of ["switch.b", "switch.c", "switch.d"]) {
    assert.equal(hiddenInHa(hass, id), true);
    assert.equal(isRelevant(hass, id), false);
  }
});
