// Axonometra: the first-run wizard's process, apart from how it is drawn. A state, the steps that apply to it, whether
// each is ready to leave, and what finishing writes: an ordinary plan the editor then refines. A building starts
// empty in the editor; a boat is read (or typed in), given a hull from the library fitted to her measures and the
// equipment the owner confirmed, and lands on the water in the 3D view.

import { emptyBuilding, type Building } from "../model.ts";
import { vesselBuilding } from "../vessel/plan.ts";
import type { VesselSpec } from "../vessel/spec.ts";
import { noDetails, type VesselDetails } from "./details.ts";
import { proposeEquipment, withEquipment, type ProposedComponent } from "./equipment.ts";
import { fitHull, HULL_CHOICES, rankHulls, type HullChoice } from "./hulls.ts";

export type StepId = "kind" | "source" | "details" | "hull" | "equipment" | "review";

export interface FirstRunState {
  kind: "vessel" | "building" | null;
  /** The source the details were read from; "manual" when typed in. */
  source: string | null;
  details: VesselDetails;
  hull: string | null;
  equipment: ProposedComponent[];
}

export function startState(): FirstRunState {
  return { kind: null, source: null, details: noDetails(), hull: null, equipment: [] };
}

interface Step {
  id: StepId;
  applies(s: FirstRunState): boolean;
  ready(s: FirstRunState): boolean;
}

const vessel = (s: FirstRunState) => s.kind === "vessel";
const positive = (v: number | undefined) => v === undefined || (Number.isFinite(v) && v > 0);

export const STEPS: Step[] = [
  { id: "kind", applies: () => true, ready: (s) => s.kind !== null },
  { id: "source", applies: vessel, ready: (s) => s.source !== null },
  { id: "details", applies: vessel, ready: (s) => detailsProblems(s.details).length === 0 },
  { id: "hull", applies: vessel, ready: (s) => HULL_CHOICES.some((h) => h.id === s.hull) },
  { id: "equipment", applies: vessel, ready: (s) => equipmentProblem(s) === null },
  { id: "review", applies: () => true, ready: () => true },
];

/** The details' problems, by field: a measure must be positive, and the length is needed to fit a hull. */
export function detailsProblems(d: VesselDetails): (keyof VesselDetails)[] {
  const out: (keyof VesselDetails)[] = [];
  if (!d.length || !positive(d.length)) out.push("length");
  for (const k of ["beam", "draft", "airHeight"] as const) if (!positive(d[k])) out.push(k);
  if (d.beam && d.length && d.beam >= d.length) out.push("beam");
  return out;
}

/** Why the confirmed equipment cannot go on the hull, or null. */
export function equipmentProblem(s: FirstRunState): string | null {
  const spec = chosenSpec(s);
  if (!spec) return "no hull";
  try {
    withEquipment(spec, s.equipment);
    return null;
  } catch (e) {
    return (e as Error).message;
  }
}

/** The steps for this state, in order. */
export function stepsFor(s: FirstRunState): StepId[] {
  return STEPS.filter((st) => st.applies(s)).map((st) => st.id);
}

export function ready(s: FirstRunState, id: StepId): boolean {
  return STEPS.find((st) => st.id === id)!.ready(s);
}

/** The step after this one (null at the end, or while this one is not ready). */
export function nextStep(s: FirstRunState, id: StepId): StepId | null {
  if (!ready(s, id)) return null;
  const ids = stepsFor(s);
  return ids[ids.indexOf(id) + 1] ?? null;
}

export function previousStep(s: FirstRunState, id: StepId): StepId | null {
  const ids = stepsFor(s);
  return ids[ids.indexOf(id) - 1] ?? null;
}

/** Whether every step up to and including this one is ready (the stepper lets you go back to any of them). */
export function reachable(s: FirstRunState, id: StepId): boolean {
  const ids = stepsFor(s);
  const i = ids.indexOf(id);
  return i >= 0 && ids.slice(0, i).every((x) => ready(s, x));
}

/** The details are in: the library ranked for them, the best fit chosen unless the owner chose one that is there. */
export function withDetails(s: FirstRunState, details: VesselDetails): FirstRunState {
  const ranked = rankHulls(details);
  const hull = s.hull && ranked.some((h) => h.id === s.hull) ? s.hull : (ranked[0]?.id ?? null);
  return withHull({ ...s, details }, hull);
}

/** A hull chosen: the equipment is proposed again for it. */
export function withHull(s: FirstRunState, hull: string | null): FirstRunState {
  const next = { ...s, hull };
  const choice = HULL_CHOICES.find((h) => h.id === hull);
  next.equipment = choice ? proposeEquipment(s.details, fitHull(choice, s.details), choice.spec.components) : [];
  return next;
}

export function chosenHull(s: FirstRunState): HullChoice | null {
  return HULL_CHOICES.find((h) => h.id === s.hull) ?? null;
}

/** The chosen hull fitted to the boat, without her equipment. */
export function chosenSpec(s: FirstRunState): VesselSpec | null {
  const choice = chosenHull(s);
  return choice ? fitHull(choice, s.details) : null;
}

export interface FirstRunResult {
  building: Building;
  /** Where the planner goes next: the editor for a building drawn from nothing, the 3D view for a boat. */
  open: "editor" | "view";
}

/** What finishing writes. */
export function finish(s: FirstRunState): FirstRunResult {
  if (s.kind !== "vessel") return { building: emptyBuilding(), open: "editor" };
  const spec = chosenSpec(s);
  if (!spec) throw new Error("no hull chosen");
  const full = withEquipment(spec, s.equipment);
  const named: VesselSpec = { ...full, ...(s.details.name ? { name: s.details.name } : {}), ...(s.details.mmsi ? { mmsi: s.details.mmsi } : {}) };
  return { building: vesselBuilding(named), open: "view" };
}
