import { describe, expect, it } from 'vitest';
import {
  GraphWall,
  Point,
  findRooms,
  floorGeometry,
  labelPoint,
  signedArea,
  wallOutlines,
  wallPieces
} from '../geometry';
import { floorInput } from '../fromPlan';
import { FloorSerializable } from '../../editor/persistence/FloorSerializable';

const T = 20;
const nodesOf = (pts: [number, number, number][]) =>
  new Map<number, Point>(pts.map(([id, x, y]) => [id, { x, y }]));
const wall = (a: number, b: number, thickness = T): GraphWall => ({
  id: `${a}-${b}`,
  a,
  b,
  thickness
});
const near = (p: Point, x: number, y: number) => {
  expect(p.x).toBeCloseTo(x, 6);
  expect(p.y).toBeCloseTo(y, 6);
};

// A 400 × 300 room, walls running round it 1 → 2 → 3 → 4 → 1.
const room = nodesOf([
  [1, 0, 0],
  [2, 400, 0],
  [3, 400, 300],
  [4, 0, 300]
]);
const roomWalls = [wall(1, 2), wall(2, 3), wall(3, 4), wall(4, 1)];

describe('wallOutlines', () => {
  it('mitres the corners of a room', () => {
    const top = wallOutlines(room, roomWalls)[0];
    // Left of 1 → 2 (x right, y down) is +y: the inside of the room.
    near(top.aL, 10, 10);
    near(top.bL, 390, 10);
    near(top.bR, 410, -10);
    near(top.aR, -10, -10);
  });

  it('joins two walls in a straight line square', () => {
    const nodes = nodesOf([
      [1, 0, 0],
      [2, 200, 0],
      [3, 400, 0]
    ]);
    const [first, second] = wallOutlines(nodes, [wall(1, 2), wall(2, 3)]);
    near(first.bL, 200, 10);
    near(first.bR, 200, -10);
    near(second.aL, 200, 10);
    near(second.aR, 200, -10);
  });

  it('meets a T-junction on the face of the through wall', () => {
    const nodes = nodesOf([
      [1, 0, 0],
      [2, 200, 0],
      [3, 400, 0],
      [4, 200, 200]
    ]);
    const stem = wallOutlines(nodes, [wall(1, 2), wall(2, 3), wall(2, 4)])[2];
    // The stem runs down from the junction; both its corners sit on the
    // through wall's lower face, y = 10.
    near(stem.aL, 190, 10);
    near(stem.aR, 210, 10);
  });

  it('squares off a dead end', () => {
    const nodes = nodesOf([
      [1, 0, 0],
      [2, 300, 0]
    ]);
    const only = wallOutlines(nodes, [wall(1, 2)])[0];
    near(only.aL, 0, 10);
    near(only.aR, 0, -10);
    near(only.bL, 300, 10);
    near(only.bR, 300, -10);
  });

  it('squares off a mitre too sharp to draw', () => {
    // Two walls leaving node 1 about 2° apart: the mitre would run metres.
    const nodes = nodesOf([
      [1, 0, 0],
      [2, 500, 0],
      [3, 500, 17]
    ]);
    const [flat] = wallOutlines(nodes, [wall(1, 2), wall(1, 3)]);
    for (const p of [flat.aL, flat.aR]) {
      expect(Math.hypot(p.x, p.y)).toBeLessThanOrEqual(4 * T);
    }
  });
});

describe('wallPieces', () => {
  const nodes = nodesOf([
    [1, 0, 0],
    [2, 400, 0]
  ]);
  const outline = wallOutlines(nodes, [wall(1, 2)])[0];
  const base = { wallId: '1-2' };

  it('is one full-height piece with no openings', () => {
    const pieces = wallPieces(outline, nodes, [], 270, 0);
    expect(pieces.map((p) => [p.kind, p.z0, p.z1])).toEqual([['wall', 0, 270]]);
  });

  it('leaves a gap under a lintel for a door', () => {
    const pieces = wallPieces(
      outline,
      nodes,
      [{ ...base, kind: 'door', start: 100, end: 180, sill: 0, height: 210 }],
      270,
      0
    );
    expect(pieces.map((p) => [p.kind, p.z0, p.z1])).toEqual([
      ['wall', 0, 270],
      ['lintel', 210, 270],
      ['wall', 0, 270]
    ]);
    const xs = (p: (typeof pieces)[number]) => p.footprint.map((q) => q.x);
    expect(Math.max(...xs(pieces[0]))).toBeCloseTo(100);
    expect(Math.min(...xs(pieces[1]))).toBeCloseTo(100);
    expect(Math.max(...xs(pieces[1]))).toBeCloseTo(180);
  });

  it('puts a sill and a lintel round a window, raised by the floor elevation', () => {
    const pieces = wallPieces(
      outline,
      nodes,
      [
        { ...base, kind: 'window', start: 250, end: 350, sill: 90, height: 120 }
      ],
      270,
      300
    );
    expect(pieces.map((p) => [p.kind, p.z0, p.z1])).toEqual([
      ['wall', 300, 570],
      ['sill', 300, 390],
      ['lintel', 510, 570],
      ['wall', 300, 570]
    ]);
  });

  it('clamps an opening that runs off the end of the wall', () => {
    const pieces = wallPieces(
      outline,
      nodes,
      [{ ...base, kind: 'door', start: 350, end: 450, sill: 0, height: 270 }],
      270,
      0
    );
    // A full-height door at the end leaves only the wall before it.
    expect(pieces.map((p) => p.kind)).toEqual(['wall']);
  });
});

describe('findRooms', () => {
  it('finds a single room with its area', () => {
    const rooms = findRooms(room, roomWalls);
    expect(rooms).toHaveLength(1);
    expect(rooms[0].area).toBeCloseTo(400 * 300);
    expect(signedArea(rooms[0].polygon)).toBeGreaterThan(0);
  });

  it('finds the same room whichever way the walls are listed', () => {
    const reversed = [wall(2, 1), wall(3, 2), wall(4, 3), wall(1, 4)];
    expect(findRooms(room, reversed)[0].area).toBeCloseTo(400 * 300);
  });

  it('splits a room in two with a dividing wall', () => {
    const nodes = nodesOf([
      [1, 0, 0],
      [2, 200, 0],
      [3, 400, 0],
      [4, 400, 300],
      [5, 200, 300],
      [6, 0, 300]
    ]);
    const walls = [
      wall(1, 2),
      wall(2, 3),
      wall(3, 4),
      wall(4, 5),
      wall(5, 6),
      wall(6, 1),
      wall(2, 5)
    ];
    const areas = findRooms(nodes, walls).map((r) => r.area);
    expect(areas).toHaveLength(2);
    for (const a of areas) expect(a).toBeCloseTo(200 * 300);
  });

  it('ignores a wall that dead-ends inside a room', () => {
    const nodes = new Map(room);
    nodes.set(5, { x: 200, y: 0 });
    nodes.set(6, { x: 200, y: 150 });
    const walls = [
      wall(1, 5),
      wall(5, 2),
      wall(2, 3),
      wall(3, 4),
      wall(4, 1),
      wall(5, 6)
    ];
    const rooms = findRooms(nodes, walls);
    expect(rooms).toHaveLength(1);
    expect(rooms[0].area).toBeCloseTo(400 * 300);
    expect(rooms[0].polygon).toHaveLength(5); // the four corners and node 5
  });

  it('finds no room in an open outline', () => {
    expect(findRooms(room, roomWalls.slice(0, 3))).toEqual([]);
  });
});

describe('floorGeometry', () => {
  it('puts a floor slab under and a ceiling over each room', () => {
    const g = floorGeometry({
      nodes: room,
      walls: roomWalls,
      openings: [],
      wallHeight: 270,
      elevation: 300,
      slabThickness: 10
    });
    expect(g.walls).toHaveLength(4);
    expect(g.floors.map((f) => [f.z0, f.z1])).toEqual([[290, 300]]);
    expect(g.ceilings.map((c) => [c.z0, c.z1])).toEqual([[570, 580]]);
  });
});

describe('floorInput (from a saved floor)', () => {
  function saved() {
    const floor = new FloorSerializable();
    floor.wallNodes = [
      { id: 1, x: 0, y: 0 },
      { id: 2, x: 400, y: 0 }
    ];
    return floor;
  }

  it('reads wall thickness from the exterior flag and keeps each wall once', () => {
    const floor = saved();
    floor.wallNodeLinks = [
      [1, [2]],
      [2, [1]]
    ];
    floor.exteriorWalls = [[1, 2]];
    const input = floorInput(floor, 0);
    expect(input.walls).toHaveLength(1);
    expect(input.walls[0].thickness).toBe(20);
  });

  it('defaults wall height and stacks floors by storey', () => {
    const floor = saved();
    expect(floorInput(floor, 0).wallHeight).toBe(270);
    expect(floorInput(floor, 2).elevation).toBe(600);
    floor.wallHeightM = 3;
    floor.elevationM = 4;
    expect(floorInput(floor, 2).wallHeight).toBe(300);
    expect(floorInput(floor, 2).elevation).toBe(400);
  });

  it('measures an opening from the wall end the editor draws from', () => {
    // Stored as 2 → 1, so `a` is the right-hand end; the editor measures an
    // attached item's x from the left-hand end (smaller x).
    const floor = saved();
    floor.wallNodeLinks = [[2, [1]]];
    floor.furnitureArray = [
      {
        id: 1,
        texturePath: 'window',
        width: 1,
        height: 0.2,
        rotation: 0,
        x: 50,
        y: 0,
        orientation: 0,
        zIndex: 2,
        attachedToLeft: 2,
        attachedToRight: 1
      }
    ];
    const [o] = floorInput(floor, 0).openings;
    // 50–150 from the left end is 250–350 from the right end.
    expect([o.start, o.end]).toEqual([250, 350]);
    expect([o.kind, o.sill, o.height]).toEqual(['window', 90, 120]);
  });

  it('uses an item’s saved sill and height', () => {
    const floor = saved();
    floor.wallNodeLinks = [[1, [2]]];
    floor.furnitureArray = [
      {
        id: 1,
        texturePath: 'door',
        width: 0.9,
        height: 0.9,
        rotation: 0,
        x: 100,
        y: 0,
        orientation: 0,
        zIndex: 2,
        attachedToLeft: 1,
        attachedToRight: 2,
        heightM: 2.4,
        mountM: 0
      }
    ];
    const [o] = floorInput(floor, 0).openings;
    expect([o.start, o.end, o.sill, o.height]).toEqual([100, 190, 0, 240]);
  });
});

describe('labelPoint', () => {
  it('is the centroid of a rectangular room', () => {
    near(labelPoint(findRooms(room, roomWalls)[0].polygon), 200, 150);
  });

  it('stays inside an L-shaped room whose centroid falls outside', () => {
    // A thin L: 1000 wide along the top and down the left, 100 thick.
    const poly: Point[] = [
      { x: 0, y: 0 },
      { x: 0, y: 1000 },
      { x: 100, y: 1000 },
      { x: 100, y: 100 },
      { x: 1000, y: 100 },
      { x: 1000, y: 0 }
    ];
    const p = labelPoint(poly);
    const inside = (p.x < 100 && p.y < 1000) || (p.y < 100 && p.x < 1000);
    expect(p.x).toBeGreaterThan(0);
    expect(p.y).toBeGreaterThan(0);
    expect(inside).toBe(true);
  });
});
