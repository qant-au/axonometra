// Accurona: the hulls the first-run wizard offers, and how one is fitted to the boat's measures. The library is the
// example vessels for now (one plate alloy boat); each further hull that can carry a vessel plan joins it here. A
// choice is a recipe, scaled to the length, beam and draft the owner gave: the shape stays, the size is hers.

import { EXAMPLE_VESSELS } from "../plans/examples.ts";
import type { VesselSpec } from "../vessel/spec.ts";
import type { VesselDetails } from "./details.ts";

export interface HullChoice {
  id: string;
  title: string;
  note: string;
  /** The recipe at its own size. */
  spec: VesselSpec;
}

export const HULL_CHOICES: HullChoice[] = Object.entries(EXAMPLE_VESSELS).map(([id, v]) => ({ id, title: v.title, note: v.note, spec: v.spec }));

/** How far a hull is from the boat's measures (0 is a perfect fit; measures not given do not count). */
export function hullDistance(choice: HullChoice, details: VesselDetails): number {
  const p = choice.spec.hull.plate;
  const off = (given: number | undefined, own: number) => (given && given > 0 ? Math.abs(Math.log(given / own)) : 0);
  return off(details.length, p.length) + off(details.beam, p.beam) + off(details.draft, p.draft);
}

/** The library, the best fit first. */
export function rankHulls(details: VesselDetails, choices = HULL_CHOICES): HullChoice[] {
  return [...choices].sort((a, b) => hullDistance(a, details) - hullDistance(b, details));
}

const r3 = (v: number) => Math.round(v * 1000) / 1000;

/** The choice's recipe at the boat's size: along by her length, across by her beam, down by her draft. */
export function fitHull(choice: HullChoice, details: VesselDetails): VesselSpec {
  const spec = structuredClone(choice.spec);
  const p = spec.hull.plate;
  const ratio = (given: number | undefined, own: number) => (given && given > 0 ? given / own : 1);
  const along = ratio(details.length, p.length);
  const across = ratio(details.beam, p.beam);
  const down = ratio(details.draft, p.draft);
  spec.hull.plate = { ...p, length: r3(p.length * along), beam: r3(p.beam * across), transom: r3(p.transom * across), chineBeam: r3(p.chineBeam * across), draft: r3(p.draft * down), ...(p.ledge ? { ledge: r3(p.ledge * across) } : {}) };
  const t = spec.open.transom;
  spec.open = {
    ...spec.open,
    ...(spec.open.soleTo ? { soleTo: r3(spec.open.soleTo * along) } : {}),
    transom: { ...t, width: r3(Math.min(t.width * across, spec.hull.plate.transom)), ...(t.well ? { well: r3(t.well * along) } : {}) },
  };
  // her own equipment comes from the wizard's equipment step
  delete spec.components;
  return spec;
}
