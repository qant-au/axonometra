import { describe, expect, it } from 'vitest';
import {
  STOREY_HEIGHT,
  fittingSpan,
  furnitureFootprint,
  project,
  projectScene,
  rotatePlan,
  segmentFootprint,
  SceneFloor
} from '../axonometric';

const wall = (ax: number, ay: number, bx: number, by: number) => ({
  a: { x: ax, y: ay },
  b: { x: bx, y: by },
  thickness: 20
});

describe('projection basics', () => {
  it('projects height straight up the screen', () => {
    const [x0, y0] = project({ x: 100, y: 0 }, 0);
    const [x1, y1] = project({ x: 100, y: 0 }, 270);
    expect(x1).toBe(x0);
    expect(y0 - y1).toBe(270);
  });

  it('rotates a quarter turn and back', () => {
    const c = { x: 0, y: 0 };
    const p = { x: 10, y: 0 };
    expect(rotatePlan(p, c, 1)).toEqual({ x: 0, y: 10 });
    expect(rotatePlan(rotatePlan(p, c, 1), c, 3)).toEqual(p);
    expect(rotatePlan(p, c, 4)).toEqual(p);
  });

  it('widens a wall segment to its thickness', () => {
    const f = segmentFootprint({ x: 0, y: 0 }, { x: 100, y: 0 }, 20);
    expect(f.map((p) => p.y).sort((a, b) => a - b)).toEqual([-10, -10, 10, 10]);
  });

  it('rotates a furniture footprint about its corner', () => {
    const f = furnitureFootprint({
      kind: 'chair',
      x: 0,
      y: 0,
      width: 1,
      height: 0.5,
      rotation: Math.PI / 2
    });
    expect(f[1].x).toBeCloseTo(0);
    expect(f[1].y).toBeCloseTo(100);
  });

  it('measures a fitting from the wall end with the smaller x', () => {
    // Nodes given right-to-left; the offset still runs from x = 0.
    const w = wall(300, 0, 0, 0);
    const [s, e] = fittingSpan({
      kind: 'door',
      x: 100,
      y: 0,
      width: 0.9,
      height: 0.1,
      rotation: 0,
      wall: w
    });
    expect(s).toEqual({ x: 100, y: 0 });
    expect(e.x).toBeCloseTo(190);
  });
});

describe('projectScene', () => {
  const room: SceneFloor = {
    walls: [
      wall(0, 0, 400, 0),
      wall(400, 0, 400, 300),
      wall(400, 300, 0, 300),
      wall(0, 300, 0, 0)
    ],
    furniture: [
      {
        kind: 'table',
        x: 150,
        y: 100,
        width: 1,
        height: 0.8,
        rotation: 0
      }
    ]
  };

  it('draws a slab plus a top and at most two sides per box', () => {
    const { faces } = projectScene([room], 0);
    // slab: top + 2 sides; 4 walls and a table: top + up to 2 sides each
    expect(faces.length).toBeGreaterThanOrEqual(3 + 5 * 2);
    expect(faces.length).toBeLessThanOrEqual(3 + 5 * 3);
  });

  it('draws the far wall before the near wall', () => {
    const { faces } = projectScene([{ walls: room.walls, furniture: [] }], 0);
    // Index of the top face containing a given top corner of a wall.
    const topWith = (corner: { x: number; y: number }) => {
      const [cx, cy] = project(corner, 270);
      return faces.findIndex((f) =>
        f.points.some(
          ([x, y]) => Math.abs(x - cx) < 0.01 && Math.abs(y - cy) < 0.01
        )
      );
    };
    // Seen from +x +y: the wall along y = 0 is far, the one along y = 300 near.
    const far = topWith({ x: 400, y: -10 });
    const near = topWith({ x: 400, y: 310 });
    expect(far).toBeGreaterThanOrEqual(0);
    expect(near).toBeGreaterThan(far);
  });

  it('stacks a second floor one storey up', () => {
    const one = projectScene([room], 0);
    const two = projectScene([room, room], 0);
    expect(two.faces.length).toBe(one.faces.length * 2);
    const top = (p: typeof one) =>
      Math.min(...p.faces.flatMap((f) => f.points.map(([, y]) => y)));
    expect(top(one) - top(two)).toBeCloseTo(STOREY_HEIGHT);
  });

  it('places a single upper floor at its real height', () => {
    const ground = projectScene([room], 0, 0);
    const first = projectScene([room], 0, 1);
    expect(ground.viewBox[1] - first.viewBox[1]).toBeCloseTo(STOREY_HEIGHT);
  });

  it('keeps every face inside the view box at every rotation', () => {
    for (let turn = 0; turn < 4; turn++) {
      const { faces, viewBox } = projectScene([room], turn);
      const [vx, vy, vw, vh] = viewBox;
      for (const [x, y] of faces.flatMap((f) => f.points)) {
        expect(x).toBeGreaterThanOrEqual(vx);
        expect(x).toBeLessThanOrEqual(vx + vw);
        expect(y).toBeGreaterThanOrEqual(vy);
        expect(y).toBeLessThanOrEqual(vy + vh);
      }
    }
  });

  it('returns an empty scene for an empty plan', () => {
    expect(projectScene([{ walls: [], furniture: [] }], 0).faces).toEqual([]);
  });
});
