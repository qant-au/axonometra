// lw-055: one object on the floor plan and in a network diagram.
//
// COPY of @accurona/core's scene/crossover.ts (accurona f4a54d4), trimmed to
// what Axonometra uses. The published @accurona/core (0.1.0) predates it;
// replace this file with the package's exports on the next core release, and
// keep the two identical until then.
import type { Scene, SceneObject, View } from '@accurona/core';

type ViewKind = View['kind'];

/** One place an object is drawn: a view, and where in it. */
export interface ObjectPlace {
  viewId: string;
  viewName: string;
  kind: ViewKind;
  floorId?: string;
  floorName?: string;
  x?: number;
  y?: number;
  tile?: { x: number; y: number };
}

/** Every view that places `objectId`, in view order. */
export function objectPlaces(scene: Scene, objectId: string): ObjectPlace[] {
  const places: ObjectPlace[] = [];
  for (const view of scene.views ?? []) {
    const base = { viewId: view.id, viewName: view.name, kind: view.kind };
    if (view.kind === 'plan') {
      const p = view.placements?.find((q) => q.object === objectId);
      if (!p) continue;
      const floor = view.floors.find((f) => f.id === p.floor);
      places.push({
        ...base,
        floorId: p.floor,
        ...(floor?.name ? { floorName: floor.name } : {}),
        x: p.x,
        y: p.y
      });
    } else {
      const p = view.placements?.find((q) => q.object === objectId);
      if (p) places.push({ ...base, tile: p.tile });
    }
  }
  return places;
}

/**
 * The objects another editor has placed that no view of `kinds` places yet:
 * what an editor drawing `kinds` can offer to place, keeping the object's id.
 * Objects in no view at all are left out; they belong to neither editor yet.
 */
export function placedOnlyElsewhere(
  scene: Scene,
  kinds: ViewKind[]
): SceneObject[] {
  const mine = new Set(kinds);
  const here = new Set<string>();
  const elsewhere = new Set<string>();
  for (const view of scene.views ?? []) {
    const into = mine.has(view.kind) ? here : elsewhere;
    for (const p of view.placements ?? []) into.add(p.object);
  }
  return scene.objects.filter((o) => elsewhere.has(o.id) && !here.has(o.id));
}
