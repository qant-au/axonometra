// Axonometra: the equipment the first-run wizard proposes for a boat: her engines, tanks and batteries as the generic
// components a vessel plan carries (a mass and a box, vessel/spec.ts), placed where such things usually go. The owner
// confirms each one; the editor moves them later. A boat the source knows nothing about gets the chosen hull's own.

import { outboardMounts } from "../hull/open.ts";
import { vesselShell } from "../vessel/shell.ts";
import type { VesselComponent, VesselSpec } from "../vessel/spec.ts";
import type { EngineDetails, TankDetails, TankFluid, VesselDetails } from "./details.ts";

export interface ProposedComponent {
  /** Unique in the proposal: where it came from and its key there. */
  key: string;
  from: "engine" | "tank" | "battery" | "hull";
  include: boolean;
  component: VesselComponent;
}

/** What a full tank's contents weigh (kg/m³). */
const DENSITY: Record<TankFluid, number> = { fuel: 740, freshWater: 1000, wasteWater: 1010, blackWater: 1020, liveWell: 1025, lubrication: 880, gas: 550 };
const FLUID: Record<TankFluid, string> = { fuel: "Fuel", freshWater: "Fresh water", wasteWater: "Grey water", blackWater: "Black water", liveWell: "Live well", lubrication: "Oil", gas: "Gas" };
/** Mount spacing of twin and triple outboards (hull/open.ts). */
const SPACING = 0.66;

const r1 = (v: number) => Math.round(v * 10) / 10;
const r3 = (v: number) => Math.round(v * 1000) / 1000;

/** An engine's mass (kg): from its power when known. */
export function engineMass(e: EngineDetails): number {
  const kw = e.power ? e.power / 1000 : null;
  if (e.kind === "outboard" || !e.kind) return kw ? Math.round(40 + 1.75 * kw) : 150;
  return kw ? Math.round(100 + 3 * kw) : 300;
}

/** A tank's mass when full (kg): the contents, and the tank itself. */
export function tankMass(t: TankDetails): number {
  const cap = t.capacity ?? 0.1;
  return Math.round(cap * DENSITY[t.fluid] + 10 + cap * 50);
}

/** How many outboards the transom takes. */
export function outboardRoom(spec: VesselSpec): number {
  return Math.floor(spec.open.transom.width / SPACING + 1e-9) + 1;
}

/** The proposal for a boat on this hull (the recipe as fitted, without components). */
export function proposeEquipment(details: VesselDetails, spec: VesselSpec, template: VesselComponent[] = []): ProposedComponent[] {
  if (!details.engines.length && !details.tanks.length && !details.batteries.length)
    return template.map((c, i) => ({ key: `hull:${i}`, from: "hull", include: true, component: structuredClone(c) }));
  const p = spec.hull.plate;
  const sole = spec.open.sole;
  const out: ProposedComponent[] = [];
  const outboards = details.engines.filter((e) => e.kind === "outboard" || !e.kind);
  const hung = Math.min(outboards.length, outboardRoom(spec));
  outboards.forEach((e, i) => {
    const mount = i < hung ? (hung === 1 ? "outboard" : `outboard ${i + 1}`) : undefined;
    const c: VesselComponent = { name: `Outboard (${e.id})`, mass: engineMass(e), size: [0.8, 1.6, 0.6] };
    out.push({ key: `engine:${e.id}`, from: "engine", include: true, component: mount ? { ...c, mount, offset: [-0.45, 0.1, 0] } : { ...c, at: [r3(p.length * 0.1), sole + 0.8, 0] } });
  });
  const inboards = details.engines.filter((e) => e.kind && e.kind !== "outboard");
  inboards.forEach((e, i) => {
    const z = r3((i - (inboards.length - 1) / 2) * 0.8);
    out.push({ key: `engine:${e.id}`, from: "engine", include: true, component: { name: `Engine (${e.id})`, mass: engineMass(e), size: [1.0, 0.7, 0.7], at: [r3(p.length * 0.25), sole + 0.2, z] } });
  });
  details.tanks.forEach((t, i) => {
    const cap = t.capacity ?? 0.1;
    const h = 0.3;
    const w = Math.min(p.beam * 0.4, Math.sqrt(cap / h));
    const l = cap / h / w;
    const z = r3((i - (details.tanks.length - 1) / 2) * (w + 0.05));
    out.push({ key: `tank:${t.id}`, from: "tank", include: true, component: { name: `${FLUID[t.fluid]} tank (${t.id}), ${Math.round(cap * 1000)} L`, mass: tankMass(t), size: [r3(l), h, r3(w)], at: [r3(p.length * 0.31), r3(sole - 0.2), z] } });
  });
  details.batteries.forEach((b, i) => {
    out.push({ key: `battery:${b.id}`, from: "battery", include: true, component: { name: `Battery (${b.id})`, mass: r1(b.capacity ? b.capacity * 0.28 : 30), size: [0.35, 0.25, 0.2], at: [r3(p.length * 0.06), r3(sole + 0.23), r3(p.beam * 0.2 - i * 0.25)] } });
  });
  return out;
}

/** The recipe with what the owner kept, and as many outboard mounts as hang on the transom. */
export function withEquipment(spec: VesselSpec, proposal: ProposedComponent[]): VesselSpec {
  const components = proposal.filter((p) => p.include).map((p) => structuredClone(p.component));
  // the outboards kept are hung again from the first mount on, so leaving one out leaves no gap
  const hung = components.filter((c) => c.mount?.startsWith("outboard"));
  hung.forEach((c, i) => (c.mount = hung.length === 1 ? "outboard" : `outboard ${i + 1}`));
  const next: VesselSpec = { ...structuredClone(spec), outboards: hung.length, components };
  const outboards = hung.length;
  // an outboard hangs on a mount only when the transom has room for it (outboardMounts would refuse the recipe)
  outboardMounts(vesselShell(next), outboards);
  return next;
}
