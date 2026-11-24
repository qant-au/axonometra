// Axonometra: the first-run wizard's process, apart from how it is drawn. Two pages: what to plan, then the basics of
// it. Only what a plan cannot start without is asked (a boat's hull type, size and engines; a building's size and
// levels; a caravan's type and size); everything else is set once the plan is open. Finishing writes an ordinary plan
// the editor then refines: a boat lands on the water in the 3D view, a building or a caravan in the editor.

import type { Building } from "../model.ts";
import { vesselBuilding } from "../vessel/plan.ts";
import type { VesselSpec } from "../vessel/spec.ts";
import { noDetails, type VesselDetails } from "./details.ts";
import { outboardRoom, proposeEquipment, withEquipment } from "./equipment.ts";
import { fitHull, HULL_TYPES, hullRecipe } from "./hulls.ts";
import { CARAVAN_SIZES, caravanPlan, caravanProblems, HOUSE_DEFAULTS, housePlan, houseProblems, type CaravanBasics, type HouseBasics } from "./structures.ts";

export type Kind = "vessel" | "building" | "caravan";
export type StepId = "kind" | "basics";

export interface VesselBasics {
  /** A hull type's id (hulls.ts). */
  hull: string;
  /** Length overall, greatest beam and greatest draft (m). */
  length: number;
  beam: number;
  draft: number;
  engine: "outboard" | "inboard";
  engines: number;
}

export const MAX_ENGINES = 4;

export interface FirstRunState {
  kind: Kind | null;
  vessel: VesselBasics;
  building: HouseBasics;
  caravan: CaravanBasics;
}

/** A hull type's own size and engines, to start its basics from. */
export function vesselDefaults(hull: string): VesselBasics {
  const recipe = hullRecipe(hull);
  const p = recipe?.hull.plate;
  return { hull, length: p?.length ?? NaN, beam: p?.beam ?? NaN, draft: p?.draft ?? NaN, engine: "outboard", engines: recipe?.outboards ?? 1 };
}

export function startState(): FirstRunState {
  return { kind: null, vessel: vesselDefaults(HULL_TYPES[0].id), building: { ...HOUSE_DEFAULTS }, caravan: { type: "towed", ...CARAVAN_SIZES.towed } };
}

const positive = (v: number) => Number.isFinite(v) && v > 0;

function engineDetails(b: VesselBasics): VesselDetails {
  return { ...noDetails(), length: b.length, beam: b.beam, draft: b.draft, engines: Array.from({ length: b.engines }, (_, i) => ({ id: String(i + 1), kind: b.engine })) };
}

/** How many outboards hang on the hull type's transom at this size (null: no such hull, or no size yet). */
export function outboardsFit(b: VesselBasics): number | null {
  const recipe = hullRecipe(b.hull);
  return recipe && positive(b.length) && positive(b.beam) && positive(b.draft) ? outboardRoom(fitHull(recipe, b)) : null;
}

/** The boat's basics that are missing or cannot be: by field. */
export function vesselProblems(b: VesselBasics): (keyof VesselBasics)[] {
  const out: (keyof VesselBasics)[] = [];
  if (!hullRecipe(b.hull)) out.push("hull");
  for (const k of ["length", "beam", "draft"] as const) if (!positive(b[k])) out.push(k);
  if (positive(b.beam) && positive(b.length) && b.beam >= b.length) out.push("beam");
  const fit = outboardsFit(b);
  if (!Number.isInteger(b.engines) || b.engines < 0 || b.engines > MAX_ENGINES || (b.engine === "outboard" && fit !== null && b.engines > fit)) out.push("engines");
  return out;
}

/** The recipe of the boat: the hull type at her size, her engines on it. */
export function vesselSpec(b: VesselBasics): VesselSpec {
  const recipe = hullRecipe(b.hull);
  if (!recipe) throw new Error("no hull chosen");
  const details = engineDetails(b);
  const fitted = fitHull(recipe, details);
  return withEquipment(fitted, proposeEquipment(details, fitted));
}

/** The basics' problems for the kind chosen, by field. */
export function problems(s: FirstRunState): string[] {
  return s.kind === "vessel" ? vesselProblems(s.vessel) : s.kind === "caravan" ? caravanProblems(s.caravan) : s.kind === "building" ? houseProblems(s.building) : [];
}

/** Whether the page can be left: a kind chosen, the basics without problems. */
export function ready(s: FirstRunState, id: StepId): boolean {
  return s.kind !== null && (id === "kind" || problems(s).length === 0);
}

export interface FirstRunResult {
  building: Building;
  /** Where the planner goes next: the editor for a building or a caravan, the 3D view for a boat. */
  open: "editor" | "view";
}

/** What finishing writes. */
export function finish(s: FirstRunState): FirstRunResult {
  if (s.kind === "vessel") return { building: vesselBuilding(vesselSpec(s.vessel)), open: "view" };
  if (s.kind === "caravan") return { building: caravanPlan(s.caravan), open: "editor" };
  return { building: housePlan(s.building), open: "editor" };
}
