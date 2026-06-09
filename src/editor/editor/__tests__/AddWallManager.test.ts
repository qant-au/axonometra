import { beforeEach, describe, expect, it, vi } from 'vitest';

// Install the Pixi mock before importing anything that touches pixi.js.
// vi.mock factories are hoisted, so the dynamic import inside resolves
// before AddWallManager.ts pulls in Graphics.
vi.mock('pixi.js', async () => {
  const { createPixiMock } = await import('../../../test/pixiMock');
  return createPixiMock();
});

// FloorPlan.Instance is what checkStep iterates. We stub the singleton so
// checkStep sees a deterministic node map.
const wallNodes = new Map<number, { x: number; y: number }>();
vi.mock('../objects/FloorPlan', () => ({
  FloorPlan: {
    Instance: {
      getWallNodeSeq: () => ({
        getWallNodes: () => wallNodes
      })
    }
  }
}));

const { AddWallManager } = await import('../actions/AddWallManager');
const { SNAP_THRESHOLD, METER } = await import('../constants');

describe('AddWallManager.checkStep', () => {
  beforeEach(() => {
    wallNodes.clear();
    // Reset singleton between tests so previousNode doesn't leak.
    AddWallManager.Instance.unset();
  });

  describe('with no previousNode (first click)', () => {
    it('accepts coords that are far from every existing node', () => {
      wallNodes.set(1, { x: 0, y: 0 });
      const ok = AddWallManager.Instance.checkStep({
        x: 5 * METER,
        y: 5 * METER
      });
      expect(ok).toBe(true);
    });

    it('accepts the very first node when the map is empty', () => {
      expect(AddWallManager.Instance.checkStep({ x: 100, y: 100 })).toBe(true);
    });

    it('rejects coords within SNAP_THRESHOLD of an existing node', () => {
      wallNodes.set(1, { x: 0, y: 0 });
      // SNAP_THRESHOLD = 0.3 * METER = 30; (10, 10) is sqrt(200) ≈ 14.1 from origin
      expect(AddWallManager.Instance.checkStep({ x: 10, y: 10 })).toBe(false);
    });

    it('accepts coords exactly at SNAP_THRESHOLD distance', () => {
      wallNodes.set(1, { x: 0, y: 0 });
      // Distance exactly SNAP_THRESHOLD — the predicate is strict `<`, so accepted.
      expect(
        AddWallManager.Instance.checkStep({ x: SNAP_THRESHOLD, y: 0 })
      ).toBe(true);
    });
  });

  describe('with a previousNode (mid-chain)', () => {
    beforeEach(() => {
      // Plant a fake previousNode at the origin without going through
      // step() (which needs a real WallNode for AddWallAction).
      (
        AddWallManager.Instance as unknown as {
          previousNode: { x: number; y: number };
        }
      ).previousNode = { x: 0, y: 0 };
    });

    it('rejects coords within SNAP_THRESHOLD of the previous node', () => {
      expect(AddWallManager.Instance.checkStep({ x: 10, y: 10 })).toBe(false);
    });

    it('accepts coords outside SNAP_THRESHOLD of the previous node', () => {
      expect(AddWallManager.Instance.checkStep({ x: 2 * METER, y: 0 })).toBe(
        true
      );
    });
  });
});
