import { describe, expect, it, vi } from 'vitest';

// Pixi with just what SelectionOverlay draws with: Graphics records its
// polygons, and a wall maps its local points into the plan by its angle and
// position, as Pixi does.
vi.mock('pixi.js', async () => {
  const { createPixiMock } = await import('../../../../test/pixiMock');
  const base = createPixiMock();
  class Graphics extends base.Graphics {
    polys: number[][] = [];
    override clear() {
      this.polys = [];
      return this;
    }
    poly(points: number[]) {
      this.polys.push(points);
      return this;
    }
  }
  return {
    ...base,
    Graphics,
    Ticker: { shared: { add: vi.fn(), remove: vi.fn() } }
  };
});

const { SelectionOverlay } = await import('../SelectionOverlay');
const { fakeInstance } = await import('../../../../test/fakeInstance');

// A wall as Wall.drawLine leaves it: its rectangle runs (0, 0) to
// (length, thickness) in its own frame, turned by `angle` about (x, y).
function wall(x: number, y: number, angle: number, length: number) {
  const thickness = 20;
  const node = { toGlobal: () => ({ x: 999, y: 999 }) };
  return {
    length,
    thickness,
    leftNode: node,
    rightNode: node,
    toGlobal: (p: { x: number; y: number }) => {
      const c = Math.cos(angle);
      const s = Math.sin(angle);
      // The pivot: half a thickness down.
      const ly = p.y - thickness / 2;
      return { x: x + p.x * c - ly * s, y: y + p.x * s + ly * c };
    }
  };
}

function overlayFor(w: ReturnType<typeof wall>) {
  const inst = fakeInstance({
    selection: {
      getState: () => ({ refs: [{ kind: 'wall', left: 1, right: 2 }] }),
      subscribe: () => () => undefined
    },
    plan: {
      getState: () => ({ getWallNodeSeq: () => ({ getWall: () => w }) }),
      subscribe: () => () => undefined
    },
    editor: {
      getState: () => ({ activeTool: 1 }),
      subscribe: () => () => undefined
    }
  });
  const overlay = new SelectionOverlay(inst);
  // The viewport at real size, whose local frame is the plan's.
  (overlay as unknown as { parent: unknown }).parent = {
    scale: { x: 1 },
    toLocal: (p: unknown) => p
  };
  (overlay as unknown as { redraw: () => void }).redraw();
  return (overlay as unknown as { polys: number[][] }).polys;
}

describe('SelectionOverlay, a selected wall', () => {
  it('is outlined along the wall, 3 px each side', () => {
    const [poly] = overlayFor(wall(100, 50, 0, 300));
    // x from 100 to 400; y the wall's band, 40 to 60, widened to 37..63.
    expect(poly).toEqual([100, 37, 400, 37, 400, 63, 100, 63]);
  });

  it('turns with a wall that is not level', () => {
    const [poly] = overlayFor(wall(0, 0, Math.PI / 2, 200));
    const xs = poly.filter((_, i) => i % 2 === 0);
    const ys = poly.filter((_, i) => i % 2 === 1);
    // A vertical wall down x = 0: a band 26 px wide, 200 px long.
    expect(Math.min(...xs)).toBeCloseTo(-13);
    expect(Math.max(...xs)).toBeCloseTo(13);
    expect(Math.min(...ys)).toBeCloseTo(0);
    expect(Math.max(...ys)).toBeCloseTo(200);
  });
});
