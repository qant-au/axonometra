// Converts between the editor's in-memory plan (FloorPlanSerializable, cm,
// numeric ids) and the Accurona scene format, Axonometra's file format.
//
// The scene is what is saved and opened. The in-memory plan is what the
// editor, undo and the 3D view work on. A scene holds more than Axonometra
// draws (diagram views, object props, ports, links, connections), so a save
// merges the plan back into the scene that was opened and keeps the rest.
//
// Scene lengths are millimetres, x right and y down the plan; a placement's
// x and y are the centre of its footprint and its rotation is degrees
// clockwise. The editor keeps each item's top-left corner (which is also
// the point it turns about), in cm, and a door or window in the coordinates
// of the wall it sits in.
import {
  emptyScene,
  mergeScene,
  type Floor as SceneFloor,
  type PlanPlacement,
  type PlanView,
  type Scene,
  type SceneObject,
  type Wall as SceneWall
} from '../../../vendor/accurona-core';
import { getPlacementDefaults } from '../../../res/catalog';
import { INTERIOR_WALL_THICKNESS, METER, WALL_THICKNESS } from '../constants';
import {
  CURRENT_PLAN_VERSION,
  FloorPlanSerializable
} from './FloorPlanSerializable';
import { FloorSerializable } from './FloorSerializable';
import { IFurnitureSerializable } from './IFurnitureSerializable';
import { INodeSerializable } from './INodeSerializable';

/** What links the in-memory plan to the scene it came from. */
export interface SceneContext {
  opened: Scene;
  viewId: string;
  viewName: string;
  /** Scene floor id per floor index. */
  floorIds: string[];
  /** Scene id per wall node id. */
  nodeIds: Map<number, string>;
  /** Scene id per wall, keyed by its sorted node ids ("3-7"). */
  wallIds: Map<string, string>;
  /** Scene object id per furniture id. */
  objectIds: Map<number, string>;
  /** Placements Axonometra cannot draw (no element), kept as they were. */
  skipped: PlanPlacement[];
}

const newSceneId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `scene-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/** A context for a plan that did not come from a scene (new, or plan v2). */
export function newContext(
  scene: Scene = emptyScene(newSceneId())
): SceneContext {
  return {
    opened: scene,
    viewId: 'plan',
    viewName: 'Floor plan',
    floorIds: [],
    nodeIds: new Map(),
    wallIds: new Map(),
    objectIds: new Map(),
    skipped: []
  };
}

const pairKey = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);

// cm -> mm, to 0.01 mm: integers wherever the plan has whole centimetres.
const toMm = (cm: number) => Math.round(cm * 1000) / 100;
const round = (n: number, places: number) =>
  Math.round(n * 10 ** places) / 10 ** places;

const rotate = (x: number, y: number, angle: number) => ({
  x: x * Math.cos(angle) - y * Math.sin(angle),
  y: x * Math.sin(angle) + y * Math.cos(angle)
});

// The frame a wall draws in (Wall.setLineCoords / drawLine): its origin is the
// end with the smaller x (the smaller y when vertical), turned to the other
// end, with the pivot half a thickness across.
function wallFrame(
  a: INodeSerializable,
  b: INodeSerializable,
  exterior: boolean
) {
  const aFirst = a.x < b.x || (a.x === b.x && a.y < b.y);
  const [o, e] = aFirst ? [a, b] : [b, a];
  return {
    origin: { x: o.x, y: o.y },
    angle: Math.atan2(e.y - o.y, e.x - o.x),
    thickness: exterior ? WALL_THICKNESS : INTERIOR_WALL_THICKNESS
  };
}
type Frame = ReturnType<typeof wallFrame>;

const MIRRORS: PlanPlacement['mirror'][] = [
  undefined,
  { x: true },
  { x: true, y: true },
  { y: true }
];
const orientationOf = (mirror: PlanPlacement['mirror']) =>
  mirror?.x ? (mirror.y ? 2 : 1) : mirror?.y ? 3 : 0;

function freshId(wanted: string, used: Set<string>): string {
  let id = wanted.replace(/[^A-Za-z0-9_-]/g, '-').slice(0, 56) || 'id';
  for (let n = 2; used.has(id); n++) id = `${wanted.slice(0, 56)}-${n}`;
  used.add(id);
  return id;
}

/**
 * The scene to save for `plan`: the opened scene with its plan view replaced.
 * Ids given to new floors, walls, nodes and items are remembered in `ctx`,
 * so they stay the same on every later save.
 */
export function planToScene(
  plan: FloorPlanSerializable,
  ctx: SceneContext
): Scene {
  const usedObjects = new Set([
    ...ctx.opened.objects.map((o) => o.id),
    ...ctx.objectIds.values()
  ]);
  const usedFloors = new Set(ctx.floorIds);
  const usedNodes = new Set(ctx.nodeIds.values());
  const usedWalls = new Set(ctx.wallIds.values());

  const objects: SceneObject[] = [];
  const placements: PlanPlacement[] = [];

  const floors: SceneFloor[] = plan.floors.map((floor, index) => {
    const floorId =
      ctx.floorIds[index] ?? freshId(`floor-${index}`, usedFloors);
    ctx.floorIds[index] = floorId;

    const nodeId = (id: number) => {
      let sceneId = ctx.nodeIds.get(id);
      if (!sceneId) {
        sceneId = freshId(String(id), usedNodes);
        ctx.nodeIds.set(id, sceneId);
      }
      return sceneId;
    };
    const nodes = new Map(floor.wallNodes.map((n) => [n.id, n]));
    const exterior = new Set(
      (floor.exteriorWalls ?? []).map(([a, b]) => pairKey(a, b))
    );

    const walls: SceneWall[] = [];
    const frames = new Map<string, Frame>();
    for (const [a, links] of floor.wallNodeLinks) {
      for (const b of links) {
        const key = pairKey(a, b);
        if (frames.has(key) || !nodes.has(a) || !nodes.has(b)) continue;
        const isExterior = exterior.has(key);
        frames.set(key, wallFrame(nodes.get(a)!, nodes.get(b)!, isExterior));
        let id = ctx.wallIds.get(key);
        if (!id) {
          id = freshId(
            `w-${nodeId(Math.min(a, b))}-${nodeId(Math.max(a, b))}`,
            usedWalls
          );
          ctx.wallIds.set(key, id);
        }
        walls.push({
          id,
          from: nodeId(a),
          to: nodeId(b),
          ...(isExterior ? { exterior: true } : {})
        });
      }
    }

    for (const item of floor.furnitureArray) {
      let objectId = ctx.objectIds.get(item.id);
      if (!objectId) {
        objectId = freshId(String(item.id), usedObjects);
        ctx.objectIds.set(item.id, objectId);
      }
      objects.push({ id: objectId, element: item.texturePath });

      const w = item.width * METER;
      const d = item.height * METER;
      const half = rotate(w / 2, d / 2, item.rotation);
      let centre = { x: item.x + half.x, y: item.y + half.y };
      const key =
        item.attachedToLeft != null && item.attachedToRight != null
          ? pairKey(item.attachedToLeft, item.attachedToRight)
          : undefined;
      const frame = key ? frames.get(key) : undefined;
      if (frame) {
        const p = rotate(centre.x, centre.y - frame.thickness / 2, frame.angle);
        centre = { x: frame.origin.x + p.x, y: frame.origin.y + p.y };
      }
      const degrees = round((item.rotation * 180) / Math.PI, 6);
      placements.push({
        object: objectId,
        floor: floorId,
        x: toMm(centre.x),
        y: toMm(centre.y),
        ...(degrees ? { rotation: degrees } : {}),
        ...(MIRRORS[item.orientation]
          ? { mirror: MIRRORS[item.orientation] }
          : {}),
        ...(item.mountM != null
          ? { mountMm: round(item.mountM * 1000, 2) }
          : {}),
        size: {
          w: toMm(w),
          d: toMm(d),
          ...(item.heightM != null ? { h: round(item.heightM * 1000, 2) } : {})
        },
        ...(frame && key ? { attach: { wall: ctx.wallIds.get(key)! } } : {})
      });
    }

    return {
      id: floorId,
      nodes: floor.wallNodes.map((n) => ({
        id: nodeId(n.id),
        x: toMm(n.x),
        y: toMm(n.y)
      })),
      walls,
      ...(floor.elevationM != null
        ? { elevationMm: round(floor.elevationM * 1000, 2) }
        : {}),
      ...(floor.wallHeightM != null
        ? { wallHeightMm: round(floor.wallHeightM * 1000, 2) }
        : {})
    };
  });

  // Items Axonometra could not draw keep their place, while their floor and
  // wall still exist.
  const floorWalls = new Map(
    floors.map((f) => [f.id, new Set((f.walls ?? []).map((w) => w.id))])
  );
  for (const p of ctx.skipped) {
    const walls = floorWalls.get(p.floor);
    if (!walls || usedObjectIsPlaced(placements, p.object)) continue;
    const { attach, ...rest } = p;
    placements.push(attach && !walls.has(attach.wall) ? rest : p);
    objects.push({ id: p.object });
  }

  const view: PlanView = {
    id: ctx.viewId,
    kind: 'plan',
    name: ctx.viewName,
    floors,
    placements
  };
  const otherPlans = (ctx.opened.views ?? []).filter(
    (v) => v.kind === 'plan' && v.id !== ctx.viewId
  );
  return mergeScene(ctx.opened, {
    viewKinds: ['plan'],
    views: [view, ...otherPlans],
    objects,
    objectFields: ['element'],
    preserve: {
      placement: ['layer', 'symbol'],
      floor: ['name'],
      wall: ['layer']
    },
    set: { units: plan.units as Scene['units'] }
  });
}

const usedObjectIsPlaced = (placements: PlanPlacement[], object: string) =>
  placements.some((p) => p.object === object);

/**
 * The in-memory plan for a scene: its first plan view (a scene with none is
 * an empty plan), and the context that saves it back into that scene.
 */
export function sceneToPlan(scene: Scene): {
  plan: FloorPlanSerializable;
  ctx: SceneContext;
} {
  const ctx = newContext(scene);
  const view = (scene.views ?? []).find(
    (v): v is PlanView => v.kind === 'plan'
  );
  const plan = new FloorPlanSerializable();
  plan.version = CURRENT_PLAN_VERSION;
  plan.furnitureId = 0;
  plan.wallNodeId = 0;
  if (scene.units && scene.units !== 'mm') plan.units = scene.units;
  if (!view) return { plan, ctx };

  ctx.viewId = view.id;
  ctx.viewName = view.name;
  const objects = new Map(scene.objects.map((o) => [o.id, o]));
  let nextNode = 0;
  let nextItem = 0;

  plan.floors = view.floors.map((sceneFloor, index) => {
    ctx.floorIds[index] = sceneFloor.id;
    const floor = new FloorSerializable();
    const internal = new Map<string, number>();
    for (const node of sceneFloor.nodes ?? []) {
      const id = ++nextNode;
      internal.set(node.id, id);
      ctx.nodeIds.set(id, node.id);
      floor.wallNodes.push({ id, x: node.x / 10, y: node.y / 10 });
    }
    const nodes = new Map(floor.wallNodes.map((n) => [n.id, n]));

    const links = new Map<number, number[]>();
    const exterior: [number, number][] = [];
    const frames = new Map<string, { frame: Frame; a: number; b: number }>();
    for (const wall of sceneFloor.walls ?? []) {
      const a = internal.get(wall.from)!;
      const b = internal.get(wall.to)!;
      const [lo, hi] = a < b ? [a, b] : [b, a];
      if (!links.has(lo)) links.set(lo, []);
      links.get(lo)!.push(hi);
      if (wall.exterior) exterior.push([a, b]);
      ctx.wallIds.set(pairKey(a, b), wall.id);
      frames.set(wall.id, {
        frame: wallFrame(nodes.get(a)!, nodes.get(b)!, !!wall.exterior),
        a,
        b
      });
    }
    floor.wallNodeLinks = [...links.entries()];
    if (exterior.length) floor.exteriorWalls = exterior;
    if (sceneFloor.elevationMm != null)
      floor.elevationM = sceneFloor.elevationMm / 1000;
    if (sceneFloor.wallHeightMm != null)
      floor.wallHeightM = sceneFloor.wallHeightMm / 1000;

    for (const p of view.placements ?? []) {
      if (p.floor !== sceneFloor.id) continue;
      const element = objects.get(p.object)?.element;
      if (!element) {
        ctx.skipped.push(p);
        continue;
      }
      const defaults = getPlacementDefaults(element);
      const w = p.size?.w != null ? p.size.w / 10 : (defaults?.w ?? METER);
      const d = p.size?.d != null ? p.size.d / 10 : (defaults?.d ?? METER);
      const rotation = ((p.rotation ?? 0) * Math.PI) / 180;
      const attached = p.attach ? frames.get(p.attach.wall) : undefined;

      let centre = { x: p.x / 10, y: p.y / 10 };
      if (attached) {
        const { frame } = attached;
        const local = rotate(
          centre.x - frame.origin.x,
          centre.y - frame.origin.y,
          -frame.angle
        );
        centre = { x: local.x, y: local.y + frame.thickness / 2 };
      }
      const half = rotate(w / 2, d / 2, rotation);
      const id = ++nextItem;
      ctx.objectIds.set(id, p.object);
      const item: IFurnitureSerializable = {
        id,
        texturePath: element,
        width: w / METER,
        height: d / METER,
        x: centre.x - half.x,
        y: centre.y - half.y,
        rotation,
        orientation: orientationOf(p.mirror),
        zIndex: defaults?.zIndex ?? ((p.mountMm ?? 0) > 0 ? 2 : 1)
      };
      if (attached) {
        item.attachedToLeft = attached.a;
        item.attachedToRight = attached.b;
      }
      if (p.size?.h != null) item.heightM = p.size.h / 1000;
      if (p.mountMm != null) item.mountM = p.mountMm / 1000;
      floor.furnitureArray.push(item);
    }
    return floor;
  });
  plan.furnitureId = nextItem;
  plan.wallNodeId = nextNode;
  return { plan, ctx };
}
