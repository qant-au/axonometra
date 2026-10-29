// Axonometra: mass calculation, which a plan can do without. Off unless the plan's settings turn it on (`mass`, an extra
// field both hosts pass through): with it off a vessel sits at her design waterline and nothing asks for a mass. With
// it on, every item on her decks counts: its own mass when one is entered, else its type's default below. Types only
// and small, so the editor can show the fields without taking the hull code in.

import type { Furniture, FurnitureType } from "../model.ts";
import type { ModuleField } from "../modules.ts";
import type { Weighted } from "./spec.ts";

/** Typical masses of the built-in items (kg), as delivered: no water in a bath, no food in a fridge. */
export const MASS_DEFAULTS: Record<FurnitureType, number> = {
  lamp_ceiling: 2,
  lamp_downlight: 0.5,
  lamp_spot: 0.5,
  lamp_panel: 3,
  lamp_pendant: 2,
  lamp_floor: 6,
  lamp_table: 2,
  lamp_wall: 1,
  led_strip: 0.3,
  lamp_uplight: 3,
  lamp_bollard: 8,
  lamp_garden: 3,
  radiator: 25,
  ac_unit: 12,
  sofa: 60,
  sofa_l: 90,
  sofa_u: 120,
  armchair: 25,
  stool: 4,
  coffee_table: 20,
  tv_board: 30,
  tv_wall: 15,
  sideboard: 40,
  shelf: 25,
  plant: 10,
  rug: 8,
  table: 35,
  table_round: 30,
  chair: 6,
  bench: 15,
  corner_bench: 40,
  bar_stool: 6,
  kitchen: 60,
  kitchen_wall: 25,
  kitchen_tall: 60,
  island: 120,
  worktop: 20,
  sink: 15,
  stove: 45,
  dishwasher: 45,
  fridge: 60,
  bed: 60,
  bunk_bed: 70,
  nightstand: 12,
  wardrobe: 80,
  dresser: 40,
  bathtub: 50,
  shower: 40,
  wc: 25,
  washbasin: 15,
  washer: 70,
  dryer: 40,
  desk: 30,
  office_chair: 15,
  tall_cabinet: 40,
  coat_rack: 8,
  stairs: 200,
  stairs_u: 350,
  robot_vacuum: 4,
  inverter: 25,
  home_battery: 120,
  wallbox: 5,
  meter: 2,
  grid_point: 2,
  pool_pump: 15,
  pool_filter: 40,
  pool_heat_pump: 70,
  pool_dosing: 8,
  pool_valve: 3,
  parking: 1500,
  fridge_smart: 70,
  stairwell: 0,
  awning: 30,
  waste_bin: 10,
  mailbox: 5,
  wall_switch: 0.1,
  wall_socket: 0.1,
  lamp_fan: 6,
  wifi_ap: 0.5,
  water_heater: 80,
};

/** A pack's item has no default of its own: its box at this density (kg/m³), about that of furniture. */
export const PACK_DENSITY = 100;

type Item = Pick<Furniture, "type" | "w" | "d" | "h"> & Weighted;

/** Whether the plan calculates masses (off unless its settings say so). */
export function massOn(building: unknown): boolean {
  return (building as { settings?: { mass?: unknown } } | null)?.settings?.mass === true;
}

/** An item's default mass (kg): its type's, or a pack item's from its box. */
export function defaultMass(item: Item): number {
  const d = (MASS_DEFAULTS as Record<string, number>)[item.type];
  return d ?? Math.max(0.1, Math.round(item.w * item.d * item.h * PACK_DENSITY * 10) / 10);
}

/** An item's entered mass (kg), or null when it has none. */
export function enteredMass(item: object): number | null {
  const m = (item as Weighted).component?.mass;
  return typeof m === "number" && Number.isFinite(m) && m >= 0 ? m : null;
}

/** The mass an item counts with (kg): its own when entered (0 included), else its default. */
export function itemMass(item: Item): number {
  return enteredMass(item) ?? defaultMass(item);
}

const STRINGS = {
  en: {
    mass_on: "Calculate masses (trim, heel and draining)",
    mass_hint: "Off: the boat sits at her design waterline. On: every item counts, with its default mass unless you enter one.",
    mass: "Mass (kg)",
    mass_default: "Default {kg} kg",
  },
  de: {
    mass_on: "Massen berechnen (Trimm, Krängung und Lenzen)",
    mass_hint: "Aus: das Boot liegt auf seiner Konstruktionswasserlinie. An: jedes Teil zählt, mit seiner Standardmasse, solange keine eingetragen ist.",
    mass: "Masse (kg)",
    mass_default: "Standard {kg} kg",
  },
} as const;

function say(language: string, key: keyof (typeof STRINGS)["en"], kg?: number): string {
  const table = language.startsWith("de") ? STRINGS.de : STRINGS.en;
  return table[key].replace("{kg}", String(kg ?? ""));
}

/** The plan setting, in the house settings of a plan drawn in a vessel (nothing for a building). */
export function massSettingFields(building: unknown, language: string, set: (on: boolean) => void): ModuleField[] {
  if (!(building as { vessel?: unknown } | null)?.vessel) return [];
  return [
    { kind: "check", label: say(language, "mass_on"), value: massOn(building), set },
    { kind: "text", text: say(language, "mass_hint") },
  ];
}

/** An item's mass in its form, while the plan calculates masses (empty clears it back to the default). */
export function massFields(building: unknown, item: Item, language: string, set: (mass: number | null) => void): ModuleField[] {
  if (!massOn(building) || !(building as { vessel?: unknown } | null)?.vessel) return [];
  const d = defaultMass(item);
  return [{ kind: "number", label: say(language, "mass"), value: enteredMass(item), min: 0, step: 0.1, placeholder: say(language, "mass_default", d), set }];
}
