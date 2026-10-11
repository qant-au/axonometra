// Axonometric (isometric) projection of the plan: walls extruded to storey
// height, furniture as low blocks, doors and windows as panels in their walls.
// Pure geometry over plain data, so it is testable without Pixi and draws
// to SVG. Plan units are the editor's: 100 per metre, y pointing down.
import {
  DOOR_HEIGHT,
  METER,
  SLAB_THICKNESS,
  STOREY_HEIGHT,
  WALL_HEIGHT,
  WINDOW_SILL
} from '../editor/constants';

export interface ScenePoint {
  x: number;
  y: number;
}

export interface SceneWall {
  a: ScenePoint;
  b: ScenePoint;
  thickness: number;
}

export interface SceneFurniture {
  kind: string;
  x: number;
  y: number;
  /** metres, as stored in the plan */
  width: number;
  height: number;
  rotation: number;
  /** real height and height above the floor, in plan units; defaults apply when absent */
  tall?: number;
  mount?: number;
  /** hung from the ceiling: drawn after everything else on its floor */
  ceiling?: boolean;
  /** installed facing down: its top carries a down arrow */
  facingDown?: boolean;
  /** set for doors and windows: the wall they sit in */
  wall?: SceneWall;
}

export interface SceneFloor {
  walls: SceneWall[];
  furniture: SceneFurniture[];
  /** plan units; defaults to WALL_HEIGHT */
  wallHeight?: number;
  /** plan units above ground; defaults to stacking at STOREY_HEIGHT per floor */
  elevation?: number;
}

export interface Face {
  points: [number, number][];
  fill: string;
}

export interface ProjectOptions {
  /** Leave ceiling items out, so the room below them can be seen. */
  hideCeiling?: boolean;
}

export interface Projection {
  faces: Face[];
  /** Open polylines drawn over the faces: the down arrows on items facing down. */
  marks: [number, number][][];
  /** SVG viewBox covering every face, with a margin */
  viewBox: [number, number, number, number];
}

export { WALL_HEIGHT, STOREY_HEIGHT };
const SLAB = SLAB_THICKNESS;
const DEFAULT_FURNITURE_HEIGHT = 0.7 * METER;

const COS30 = Math.cos(Math.PI / 6);
const SIN30 = 0.5;

// Colours: [top, lit side, shaded side].
const PALETTE = {
  wall: ['#f4f1ea', '#c9c3b6', '#a39c8e'],
  slab: ['#e3e7ea', '#b8bfc5', '#9aa3ab'],
  furniture: ['#c99a6b', '#a77a4f', '#86603d'],
  door: ['#8c5a3c', '#744830', '#5c3825'],
  window: ['#bfe0f2', '#94c6e0', '#74adc9']
} as const;
type Material = keyof typeof PALETTE;

/** Rotate a plan point by `quarterTurns` × 90° about `centre`. */
export function rotatePlan(
  p: ScenePoint,
  centre: ScenePoint,
  quarterTurns: number
): ScenePoint {
  const dx = p.x - centre.x;
  const dy = p.y - centre.y;
  switch (((quarterTurns % 4) + 4) % 4) {
    case 1:
      return { x: centre.x - dy, y: centre.y + dx };
    case 2:
      return { x: centre.x - dx, y: centre.y - dy };
    case 3:
      return { x: centre.x + dy, y: centre.y - dx };
    default:
      return { x: p.x, y: p.y };
  }
}

/** Isometric screen position of a plan point at height z. */
export function project(p: ScenePoint, z: number): [number, number] {
  return [(p.x - p.y) * COS30, (p.x + p.y) * SIN30 - z];
}

/** Larger is nearer the viewer, who looks from +x +y. */
export function depthOf(p: ScenePoint): number {
  return p.x + p.y;
}

/** Corners of a segment widened to `thickness`, in order around it. */
export function segmentFootprint(
  a: ScenePoint,
  b: ScenePoint,
  thickness: number
): ScenePoint[] {
  const length = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const nx = (-(b.y - a.y) / length) * (thickness / 2);
  const ny = ((b.x - a.x) / length) * (thickness / 2);
  return [
    { x: a.x + nx, y: a.y + ny },
    { x: b.x + nx, y: b.y + ny },
    { x: b.x - nx, y: b.y - ny },
    { x: a.x - nx, y: a.y - ny }
  ];
}

/** Footprint of free-standing furniture: its top-left corner, rotated. */
export function furnitureFootprint(f: SceneFurniture): ScenePoint[] {
  const w = f.width * METER;
  const h = f.height * METER;
  const cos = Math.cos(f.rotation);
  const sin = Math.sin(f.rotation);
  return [
    [0, 0],
    [w, 0],
    [w, h],
    [0, h]
  ].map(([lx, ly]) => ({
    x: f.x + lx * cos - ly * sin,
    y: f.y + lx * sin + ly * cos
  }));
}

/**
 * A door or window's span along its wall. The wall's local origin is the end
 * with the smaller x (smaller y when vertical), matching Wall.setLineCoords.
 */
export function fittingSpan(f: SceneFurniture): [ScenePoint, ScenePoint] {
  const wall = f.wall!;
  const [origin, end] =
    wall.a.x < wall.b.x || (wall.a.x === wall.b.x && wall.a.y < wall.b.y)
      ? [wall.a, wall.b]
      : [wall.b, wall.a];
  const length = Math.hypot(end.x - origin.x, end.y - origin.y) || 1;
  const ux = (end.x - origin.x) / length;
  const uy = (end.y - origin.y) / length;
  const start = Math.max(0, Math.min(length, f.x));
  const stop = Math.max(0, Math.min(length, f.x + f.width * METER));
  return [
    { x: origin.x + ux * start, y: origin.y + uy * start },
    { x: origin.x + ux * stop, y: origin.y + uy * stop }
  ];
}

interface Box {
  footprint: ScenePoint[];
  z0: number;
  z1: number;
  material: Material;
  depth: number;
  /** tie-break so fittings draw over the wall they sit in */
  layer: number;
}

function centroid(points: ScenePoint[]): ScenePoint {
  const sum = points.reduce((s, p) => ({ x: s.x + p.x, y: s.y + p.y }), {
    x: 0,
    y: 0
  });
  return { x: sum.x / points.length, y: sum.y / points.length };
}

function makeBox(
  footprint: ScenePoint[],
  z0: number,
  z1: number,
  material: Material,
  layer = 0
): Box {
  return {
    footprint,
    z0,
    z1,
    material,
    layer,
    depth: depthOf(centroid(footprint))
  };
}

// Visible faces of an extruded convex quad: the top, and each side whose
// outward normal points toward the viewer (+x +y).
function boxFaces(box: Box): Face[] {
  const [top, lit, shaded] = PALETTE[box.material];
  const pts = box.footprint;
  const c = centroid(pts);
  const faces: Face[] = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    let nx = q.y - p.y;
    let ny = -(q.x - p.x);
    const mid = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
    if (nx * (mid.x - c.x) + ny * (mid.y - c.y) < 0) {
      nx = -nx;
      ny = -ny;
    }
    if (nx + ny <= 0) continue;
    faces.push({
      points: [
        project(p, box.z0),
        project(q, box.z0),
        project(q, box.z1),
        project(p, box.z1)
      ],
      // Faces turned toward +x read as lit, toward +y as shaded.
      fill: nx >= ny ? lit : shaded
    });
  }
  faces.push({ points: pts.map((p) => project(p, box.z1)), fill: top });
  return faces;
}

/**
 * An item facing down shows only its back from above, so a down arrow stands
 * on the middle of its top, as Accurona's isometric drawings mark it.
 */
function downArrow(box: Box): [number, number][][] {
  const [tx, ty] = project(centroid(box.footprint), box.z1);
  const xs = box.footprint.map((p) => p.x);
  const ys = box.footprint.map((p) => p.y);
  const extent = Math.min(
    Math.max(...xs) - Math.min(...xs),
    Math.max(...ys) - Math.min(...ys)
  );
  const len = Math.max(8, extent * 0.4);
  const head = len * 0.35;
  return [
    [
      [tx, ty - len],
      [tx, ty]
    ],
    [
      [tx - head * 0.7, ty - head],
      [tx, ty],
      [tx + head * 0.7, ty - head]
    ]
  ];
}

function planCentre(floors: SceneFloor[]): ScenePoint {
  const pts = floors.flatMap((f) => f.walls.flatMap((w) => [w.a, w.b]));
  if (pts.length === 0) return { x: 0, y: 0 };
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  return {
    x: (Math.min(...xs) + Math.max(...xs)) / 2,
    y: (Math.min(...ys) + Math.max(...ys)) / 2
  };
}

/**
 * Project floors (lowest first) as seen after `quarterTurns` × 90° of
 * rotation. `firstLevel` is the storey index of floors[0], so a single upper
 * floor can be drawn at its real height.
 */
export function projectScene(
  floors: SceneFloor[],
  quarterTurns: number,
  firstLevel = 0,
  options: ProjectOptions = {}
): Projection {
  const centre = planCentre(floors);
  const turn = (p: ScenePoint) => rotatePlan(p, centre, quarterTurns);
  const faces: Face[] = [];
  const marks: [number, number][][] = [];

  floors.forEach((floor, index) => {
    const base = floor.elevation ?? (firstLevel + index) * STOREY_HEIGHT;
    const wallHeight = floor.wallHeight ?? WALL_HEIGHT;
    const boxes: Box[] = [];
    const overhead: Box[] = [];
    const downArrows = new Set<Box>();

    const nodes = floor.walls.flatMap((w) => [w.a, w.b]).map(turn);
    if (nodes.length > 0) {
      const pad = 0.5 * METER;
      const xs = nodes.map((p) => p.x);
      const ys = nodes.map((p) => p.y);
      const [x0, x1] = [Math.min(...xs) - pad, Math.max(...xs) + pad];
      const [y0, y1] = [Math.min(...ys) - pad, Math.max(...ys) + pad];
      // The slab sits under everything on its floor, so it draws first.
      const slab = makeBox(
        [
          { x: x0, y: y0 },
          { x: x1, y: y0 },
          { x: x1, y: y1 },
          { x: x0, y: y1 }
        ],
        base - SLAB,
        base,
        'slab'
      );
      faces.push(...boxFaces(slab));
    }

    for (const wall of floor.walls) {
      boxes.push(
        makeBox(
          segmentFootprint(turn(wall.a), turn(wall.b), wall.thickness),
          base,
          base + wallHeight,
          'wall'
        )
      );
    }

    for (const item of floor.furniture) {
      if (item.wall) {
        const [s, e] = fittingSpan(item);
        const isDoor = item.kind === 'door';
        const box = makeBox(
          segmentFootprint(turn(s), turn(e), item.wall.thickness + 4),
          base + (item.mount ?? (isDoor ? 0 : WINDOW_SILL)),
          base +
            (item.mount ?? (isDoor ? 0 : WINDOW_SILL)) +
            (item.tall ?? (isDoor ? DOOR_HEIGHT : DOOR_HEIGHT - WINDOW_SILL)),
          isDoor ? 'door' : 'window',
          1
        );
        // Draw right after the wall that holds it.
        box.depth = depthOf(
          centroid(
            segmentFootprint(
              turn(item.wall.a),
              turn(item.wall.b),
              item.wall.thickness
            )
          )
        );
        boxes.push(box);
      } else {
        if (item.ceiling && options.hideCeiling) continue;
        const box = makeBox(
          furnitureFootprint(item).map(turn),
          base + (item.mount ?? 0),
          base + (item.mount ?? 0) + (item.tall ?? DEFAULT_FURNITURE_HEIGHT),
          'furniture'
        );
        if (item.facingDown) downArrows.add(box);
        // Ceiling items are above everything standing on the floor, so they
        // draw after it and are never lost under a table or a wardrobe.
        (item.ceiling ? overhead : boxes).push(box);
      }
    }

    const order = (p: Box, q: Box) => p.depth - q.depth || p.layer - q.layer;
    for (const box of [...boxes.sort(order), ...overhead.sort(order)]) {
      faces.push(...boxFaces(box));
      if (downArrows.has(box)) marks.push(...downArrow(box));
    }
  });

  const all = [...faces.flatMap((f) => f.points), ...marks.flat()];
  if (all.length === 0) return { faces, marks, viewBox: [0, 0, 100, 100] };
  const xs = all.map(([x]) => x);
  const ys = all.map(([, y]) => y);
  const margin = 0.5 * METER;
  const minX = Math.min(...xs) - margin;
  const minY = Math.min(...ys) - margin;
  return {
    faces,
    marks,
    viewBox: [
      minX,
      minY,
      Math.max(...xs) + margin - minX,
      Math.max(...ys) + margin - minY
    ]
  };
}
