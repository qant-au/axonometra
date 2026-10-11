import { beforeEach, describe, expect, it, vi } from 'vitest';

// Install the Pixi mock before importing anything that touches pixi.js.
// vi.mock factories are hoisted, so the dynamic import inside resolves
// before AddWallManager.ts pulls in Graphics.
vi.mock('pixi.js', async () => {
  const { createPixiMock } = await import('../../../test/pixiMock');
  return createPixiMock();
});

// The floor plan is what checkStep iterates. A stub gives checkStep a
// deterministic node map.
const wallNodes = new Map<number, { x: number; y: number }>();

const { AddWallManager } = await import('../actions/AddWallManager');
const { SNAP_THRESHOLD, METER } = await import('../constants');
const { fakeInstance } = await import('../../../test/fakeInstance');

let manager: InstanceType<typeof AddWallManager>;

describe('AddWallManager.checkStep', () => {
  beforeEach(() => {
    wallNodes.clear();
    // A new editor for each test, so previousNode doesn't leak.
    manager = new AddWallManager(
      fakeInstance({
        plan: {
          getState: () => ({
            getWallNodeSeq: () => ({ getWallNodes: () => wallNodes })
          })
        }
      })
    );
  });

  describe('with no previousNode (first click)', () => {
    it('accepts coords that are far from every existing node', () => {
      wallNodes.set(1, { x: 0, y: 0 });
      const ok = manager.checkStep({
        x: 5 * METER,
        y: 5 * METER
      });
      expect(ok).toBe(true);
    });

    it('accepts the very first node when the map is empty', () => {
      expect(manager.checkStep({ x: 100, y: 100 })).toBe(true);
    });

    it('rejects coords within SNAP_THRESHOLD of an existing node', () => {
      wallNodes.set(1, { x: 0, y: 0 });
      // SNAP_THRESHOLD = 0.3 * METER = 30; (10, 10) is sqrt(200) ≈ 14.1 from origin
      expect(manager.checkStep({ x: 10, y: 10 })).toBe(false);
    });

    it('accepts coords exactly at SNAP_THRESHOLD distance', () => {
      wallNodes.set(1, { x: 0, y: 0 });
      // Distance exactly SNAP_THRESHOLD — the predicate is strict `<`, so accepted.
      expect(manager.checkStep({ x: SNAP_THRESHOLD, y: 0 })).toBe(true);
    });
  });

  describe('with a previousNode (mid-chain)', () => {
    beforeEach(() => {
      // Plant a fake previousNode at the origin without going through
      // step() (which needs a real WallNode for AddWallAction).
      (
        manager as unknown as {
          previousNode: { x: number; y: number };
        }
      ).previousNode = { x: 0, y: 0 };
    });

    it('rejects coords within SNAP_THRESHOLD of the previous node', () => {
      expect(manager.checkStep({ x: 10, y: 10 })).toBe(false);
    });

    it('accepts coords outside SNAP_THRESHOLD of the previous node', () => {
      expect(manager.checkStep({ x: 2 * METER, y: 0 })).toBe(true);
    });
  });
});

describe('AddWallManager ending a chain', () => {
  // The Wall drawing mode notification stayed up after Escape ended the
  // chain (sweep 2026-09-30).
  const withNode = (isolated: boolean) => {
    const node = { getId: () => 7 };
    const remove = vi.fn();
    const dismissToolHint = vi.fn();
    const m = new AddWallManager(
      fakeInstance({
        dismissToolHint,
        plan: {
          getState: () => ({
            getWallNodeSeq: () => ({
              getWallNodes: () => new Map([[7, node]]),
              isIsolated: () => isolated,
              remove
            })
          })
        }
      })
    );
    return { m, node, remove, dismissToolHint };
  };

  it('takes the drawing hint down', () => {
    const { m, node, dismissToolHint } = withNode(false);
    m.unset();
    expect(dismissToolHint).not.toHaveBeenCalled();
    m.previousNode = node as never;
    m.unset();
    expect(dismissToolHint).toHaveBeenCalledOnce();
    expect(m.previousNode).toBeUndefined();
  });

  it('removes the first node of a chain that never drew a wall', () => {
    const lone = withNode(true);
    lone.m.previousNode = lone.node as never;
    lone.m.unset();
    expect(lone.remove).toHaveBeenCalledWith(7);
    const joined = withNode(false);
    joined.m.previousNode = joined.node as never;
    joined.m.unset();
    expect(joined.remove).not.toHaveBeenCalled();
  });
});
