// Axonometra: a vessel's decks as a plan. Each deck is a floor at its height above the waterline, its rooms the deck's
// outline inside the plating; the hull itself is not walls (its rooms have none) but the vessel bundle's meshes
// (meshes.ts), drawn round them in the 3D view.

import type { Building, Floor, Room, Vec2 } from "../model.ts";
import { emptyBuilding, newFloor } from "../model.ts";
import type { OpenHull } from "../hull/open.ts";
import { bodyRange, halfAt, sheerAt } from "../hull/sections.ts";
import { vesselShells, type Shell } from "./shell.ts";
import type { VesselSpec } from "./spec.ts";

/** How deep a floor's slab is drawn below it (viewer/build.ts SLAB): the outline is taken there, so it stays inside. */
const SLAB = 0.2;
/** How far forward a multihull's bridge deck runs, as a share of her length: forward of it her bows stand apart. */
const BRIDGE = 0.65;

const r3 = (v: number) => Math.round(v * 1000) / 1000;

/** The inside half-breadth of a hull's plating at x for a deck at height y: where its slab still fits. */
const inside = (shell: OpenHull, x: number, y: number) => Math.max(0, Math.min(halfAt(shell.inner, x, y) ?? 0, halfAt(shell.inner, x, y - SLAB) ?? 0));

/** A deck's outline inside the plating from x0 to x1 at height y: starboard forward, then port aft. */
export function deckOutline(shell: OpenHull, y: number, x0: number, x1: number, n = 24): Vec2[] {
  const xs = Array.from({ length: n + 1 }, (_, i) => x0 + ((x1 - x0) * i) / n).filter((x) => inside(shell, x, y) > 0.05);
  return [...xs.map((x): Vec2 => [r3(x), r3(inside(shell, x, y))]), ...[...xs].reverse().map((x): Vec2 => [r3(x), r3(-inside(shell, x, y))])];
}

const room = (id: string, name: string, points: Vec2[]): Room => ({ id, name, area_id: null, points, floor_material: "stone", wall_heights: points.map(() => 0) });

/**
 * A multihull's bridge deck: across her hulls at the height of their sheer aft, from the transoms forward, out to
 * the inside of the outer hulls' plating.
 */
function bridgeDeck(shells: Shell[]): Floor {
  const port = shells[0];
  const starboard = shells[shells.length - 1];
  const [stern, stem] = bodyRange(port.open.body);
  const [x0] = bodyRange(port.open.inner);
  const y = r3(sheerAt(port.open.inner, x0) ?? 0);
  const n = 24;
  const xs = Array.from({ length: n + 1 }, (_, i) => x0 + ((stern + BRIDGE * (stem - stern) - x0) * i) / n);
  const floor = newFloor("deck_bridge", "Bridge Deck", y);
  floor.height = 2;
  floor.rooms.push(
    room("room_bridge", "Bridge Deck", [
      ...xs.map((x): Vec2 => [r3(x), r3(starboard.center + inside(starboard.open, x, y))]),
      ...[...xs].reverse().map((x): Vec2 => [r3(x), r3(port.center - inside(port.open, x, y))]),
    ]),
  );
  return floor;
}

/**
 * The plan of the decks: the sole, with the motor well aft of it when the boat has one. A multihull has a sole in
 * each hull, and her bridge deck over them.
 */
export function vesselFloors(spec: VesselSpec): Floor[] {
  const shells = vesselShells(spec);
  const [{ open: shell }] = shells;
  const sole = shell.sole;
  const floor = newFloor("deck_sole", "Sole", sole.y);
  const bridge = shells.length > 1 ? bridgeDeck(shells) : null;
  floor.height = r3((bridge?.elevation ?? sheerAt(shell.inner, (sole.from + sole.to) / 2) ?? sole.y + 1) - sole.y);
  floor.cut_height = Math.min(floor.cut_height, floor.height / 2);
  if (bridge) {
    const names = ["Port Hull", "Starboard Hull"];
    shells.forEach(({ open, center }, k) =>
      floor.rooms.push(room(`room_hull_${k + 1}`, names[k] ?? `Hull ${k + 1}`, deckOutline(open, sole.y, open.sole.from, open.sole.to).map(([x, z]): Vec2 => [x, r3(z + center)]))),
    );
    return [floor, bridge];
  }
  floor.rooms.push(room("room_cockpit", "Cockpit", deckOutline(shell, sole.y, sole.from, sole.to)));
  if (spec.open.transom.well) floor.rooms.push(room("room_well", "Motor well", deckOutline(shell, sole.y, shell.body.sections[0].x + spec.open.plating, spec.open.transom.well)));
  return [floor];
}

/** A plan drawn in a vessel: its decks, and the recipe with it. */
export function vesselBuilding(spec: VesselSpec): Building & { vessel: VesselSpec } {
  const b = emptyBuilding();
  b.floors = vesselFloors(spec);
  return { ...b, vessel: structuredClone(spec) };
}
