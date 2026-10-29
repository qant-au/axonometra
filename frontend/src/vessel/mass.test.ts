import assert from "node:assert/strict";
import { test } from "node:test";
import { FURNITURE_TYPES, type Furniture } from "../model.ts";
import { numberField, type ModuleField } from "../modules.ts";
import { EXAMPLE_VESSELS } from "../plans/examples.ts";
import { defaultMass, enteredMass, itemMass, MASS_DEFAULTS, massFields, massOn, massSettingFields, PACK_DENSITY } from "./mass.ts";
import { vesselBuilding } from "./plan.ts";

const MODES = [true, false] as const;
const spec = EXAMPLE_VESSELS["fishing-boat-6.5m"].spec;
const item = (extra: Partial<Furniture> & { component?: { mass: number } } = {}) => ({ type: "sofa", w: 2, d: 0.9, h: 0.8, ...extra }) as Furniture;
const boat = (mass?: boolean) => {
  const b = vesselBuilding(spec);
  if (mass !== undefined) (b.settings as { mass?: boolean }).mass = mass;
  return b;
};

test("every built-in item has a default mass", () => {
  for (const t of FURNITURE_TYPES) assert.ok(typeof MASS_DEFAULTS[t] === "number" && MASS_DEFAULTS[t] >= 0, t);
  assert.equal(Object.keys(MASS_DEFAULTS).length, FURNITURE_TYPES.length, "no defaults for types that do not exist");
});

test("a pack's item takes its default from its box", () => {
  assert.equal(defaultMass(item({ type: "pack:x.y:crate", w: 1, d: 0.5, h: 0.4 })), 0.2 * PACK_DENSITY);
  assert.equal(defaultMass(item({ type: "pack:x.y:tag", w: 0.01, d: 0.01, h: 0.01 })), 0.1, "never weightless by default");
});

test("an entered mass wins over the default, 0 included; anything else falls back", () => {
  assert.equal(itemMass(item()), MASS_DEFAULTS.sofa);
  assert.equal(itemMass(item({ component: { mass: 75 } })), 75);
  assert.equal(itemMass(item({ component: { mass: 0 } })), 0);
  for (const bad of [-1, Number.NaN, "9" as unknown as number]) assert.equal(enteredMass(item({ component: { mass: bad } })), null, String(bad));
});

test("mass calculation is off by default, on only when the plan says so", () => {
  assert.equal(massOn(null), false);
  assert.equal(massOn(boat()), false);
  assert.equal(massOn(boat(false)), false);
  assert.equal(massOn(boat(true)), true);
});

for (const mass of MODES) {
  test(`the house settings of a vessel plan (mass ${mass ? "on" : "off"}): the switch shows its state and sets it`, () => {
    let got: boolean | null = null;
    const [check, hint] = massSettingFields(boat(mass), "en", (v) => (got = v));
    assert.ok(check.kind === "check" && check.value === mass && hint.kind === "text");
    check.set(!mass);
    assert.equal(got, !mass);
  });

  test(`an item's form (mass ${mass ? "on" : "off"}): a mass field only while masses are on`, () => {
    let got: number | null | undefined;
    const fields = massFields(boat(mass), item(), "en", (v) => (got = v));
    if (!mass) return assert.deepEqual(fields, []);
    const [f] = fields as Extract<ModuleField, { kind: "number" }>[];
    assert.equal(f.kind, "number");
    assert.equal(f.value, null, "no mass entered: the field is empty");
    assert.match(f.placeholder!, new RegExp(`${MASS_DEFAULTS.sofa} kg`), "the default shows in it");
    f.set(12);
    assert.equal(got, 12);
    assert.equal((massFields(boat(mass), item({ component: { mass: 30 } }), "en", () => {})[0] as { value: number }).value, 30);
  });
}

test("a plan drawn as a building shows neither the switch nor the field", () => {
  const house = { floors: [], settings: { mass: true } };
  assert.deepEqual(massSettingFields(house, "en", () => {}), []);
  assert.deepEqual(massFields(house, item(), "en", () => {}), []);
});

test("German labels for a German user", () => {
  const [check] = massSettingFields(boat(), "de", () => {});
  assert.match((check as { label: string }).label, /Massen berechnen/);
});

test("number field: empty or not a number is null, else held within its bounds", () => {
  assert.equal(numberField(""), null);
  assert.equal(numberField("  "), null);
  assert.equal(numberField("abc"), null);
  assert.equal(numberField("12.5"), 12.5);
  assert.equal(numberField("-3", 0), 0);
  assert.equal(numberField("900", 0, 500), 500);
});
