import { REDACTED_LAYER } from './schema';
import type { Anchor, Connector, Scene, View } from './schema';

// The copy of a scene that leaves the editor: everything on the reserved
// `redacted` layer taken out, and whatever referred to it made consistent,
// so the result is still a valid scene.

const kept = <T extends { layer?: string }>(list: T[] | undefined) =>
  list?.filter((entry) => entry.layer !== REDACTED_LAYER);

const placedIn = (view: View): string[] =>
  (view.placements ?? []).map((p) => p.object);

/** True when anything in the scene is on the `redacted` layer. */
export function hasRedacted(scene: Scene): boolean {
  const on = (list: { layer?: string }[] | undefined) =>
    !!list?.some((entry) => entry.layer === REDACTED_LAYER);
  return (scene.views ?? []).some((view) =>
    view.kind === 'plan'
      ? on(view.placements) || view.floors.some((f) => on(f.walls))
      : on(view.placements) ||
        on(view.connectors) ||
        on(view.rectangles) ||
        on(view.textBoxes)
  );
}

/**
 * The scene without its `redacted` layer, for an export that has not opted
 * in to it.
 *
 * - Placements, connectors, rectangles, text boxes and walls on the layer
 *   are removed.
 * - An object whose every placement was redacted is removed with them, and
 *   so are the connections that end on it. An object placed nowhere to
 *   begin with is kept.
 * - A connector that ends on an object no longer placed in its view, or on an anchor of a removed
 *   connector, is removed; a placement fixed into a removed wall keeps its
 *   position and loses the `attach`; one standing on a removed placement
 *   loses its `mountOn` and stands on the floor.
 */
export function redactScene(scene: Scene): Scene {
  const views = (scene.views ?? []).map((view): View => {
    if (view.kind === 'plan') {
      return {
        ...view,
        floors: view.floors.map((floor) =>
          floor.walls ? { ...floor, walls: kept(floor.walls) } : floor
        ),
        ...(view.placements ? { placements: kept(view.placements) } : {})
      };
    }
    const out = { ...view };
    if (view.placements) out.placements = kept(view.placements);
    if (view.connectors) out.connectors = kept(view.connectors);
    if (view.rectangles) out.rectangles = kept(view.rectangles);
    if (view.textBoxes) out.textBoxes = kept(view.textBoxes);
    return out;
  });

  const placedBefore = new Set((scene.views ?? []).flatMap(placedIn));
  const placedAfter = new Set(views.flatMap(placedIn));
  const objects = scene.objects.filter(
    (o) => !placedBefore.has(o.id) || placedAfter.has(o.id)
  );
  const objectIds = new Set(objects.map((o) => o.id));
  const connections = scene.connections?.filter(
    (c) => objectIds.has(c.from) && objectIds.has(c.to)
  );
  const connectionIds = new Set((connections ?? []).map((c) => c.id));

  const finalViews = views.map((view): View => {
    if (view.kind === 'plan') {
      const wallIds = new Set(
        view.floors.flatMap((f) => (f.walls ?? []).map((w) => w.id))
      );
      if (!view.placements) return view;
      const placed = new Set(placedIn(view));
      return {
        ...view,
        placements: view.placements.map((p) => {
          let out = p;
          if (out.attach && !wallIds.has(out.attach.wall)) {
            const { attach: _attach, ...rest } = out;
            out = rest;
          }
          if (out.mountOn !== undefined && !placed.has(out.mountOn)) {
            const { mountOn: _mountOn, ...rest } = out;
            out = { ...rest, mountFrom: 'floor' };
          }
          return out;
        })
      };
    }
    if (!view.connectors) return view;
    // A connector can end on another connector's anchor, so removing one
    // can strand another: repeat until nothing more goes.
    const placed = new Set(placedIn(view));
    let connectors: Connector[] = view.connectors;
    for (;;) {
      const anchorIds = new Set(
        connectors.flatMap((c) => c.anchors.map((a) => a.id))
      );
      const resolves = (a: Anchor) =>
        'object' in a.ref
          ? placed.has(a.ref.object)
          : 'anchor' in a.ref
            ? anchorIds.has(a.ref.anchor)
            : true;
      const next = connectors.filter((c) => c.anchors.every(resolves));
      if (next.length === connectors.length) break;
      connectors = next;
    }
    return {
      ...view,
      connectors: connectors.map((c) => {
        if (c.connection === undefined || connectionIds.has(c.connection)) {
          return c;
        }
        const { connection: _connection, ...rest } = c;
        return rest;
      })
    };
  });

  const out: Scene = { ...scene, objects };
  if (scene.views) out.views = finalViews;
  if (connections) out.connections = connections;
  return out;
}
