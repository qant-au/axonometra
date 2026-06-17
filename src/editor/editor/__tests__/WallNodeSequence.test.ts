import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('pixi.js', async () => {
  const { createPixiMock } = await import('../../../test/pixiMock');
  return createPixiMock();
});

// WallNode reads isMobile from the helper (Handle does too).
vi.mock('../../../helpers/isMobile', () => ({ isMobile: false }));

// Notifications surface from remove() when a connected node can't be deleted.
const showNotification = vi.fn();
vi.mock('@mantine/notifications', () => ({
  notifications: { show: showNotification }
}));

// Wall constructor reaches into the api-client + store + actions; we
// stub enough for `addWall` to construct without exploding. The tests
// don't drive Wall behaviour directly — only its presence in the array.
vi.mock('../../../api/api-client', () => ({
  getDoor: () => Promise.resolve([]),
  getWindow: () => Promise.resolve([])
}));
vi.mock('../../../stores/EditorStore', () => ({
  useStore: { getState: () => ({ activeTool: 0, snap: false }) }
}));
vi.mock('../objects/FloorPlan', () => ({
  FloorPlan: { Instance: { redrawWalls: vi.fn() } }
}));
vi.mock('../../EditorRoot', () => ({
  getMain: () => ({
    scale: { x: 1, y: 1 },
    corner: { x: 0, y: 0 }
  })
}));

const { WallNodeSequence } = await import('../objects/Walls/WallNodeSequence');

describe('WallNodeSequence', () => {
  beforeEach(() => {
    showNotification.mockClear();
    // Reset the static wallNodeId counter so each test starts from id 0.
    // setId is a public method that just assigns the static; we don't need a
    // real instance to reach it but constructing one is cheap.
    new WallNodeSequence().setId(0);
  });

  describe('addNode', () => {
    it('assigns sequential ids when no id is provided', () => {
      const seq = new WallNodeSequence();
      const a = seq.addNode(0, 0);
      const b = seq.addNode(100, 0);
      expect(a.getId()).toBe(1);
      expect(b.getId()).toBe(2);
      expect(seq.contains(1)).toBe(true);
      expect(seq.contains(2)).toBe(true);
    });

    it('reuses an explicit id when provided', () => {
      const seq = new WallNodeSequence();
      seq.addNode(0, 0, 42);
      expect(seq.contains(42)).toBe(true);
      // Subsequent auto-id starts from the static counter, not the explicit id.
      // (load() calls setId() to align them; addNode alone does not.)
    });

    it('initialises an empty link list for each new node', () => {
      const seq = new WallNodeSequence();
      seq.addNode(0, 0);
      const links = seq.getWallNodeLinks().get(1);
      expect(links).toEqual([]);
    });
  });

  describe('addWall', () => {
    it('returns undefined when both endpoints are the same node', () => {
      const seq = new WallNodeSequence();
      seq.addNode(0, 0);
      expect(seq.addWall(1, 1)).toBeUndefined();
    });

    it('returns undefined when adding a duplicate wall', () => {
      const seq = new WallNodeSequence();
      seq.addNode(0, 0);
      seq.addNode(100, 0);
      expect(seq.addWall(1, 2)).toBeDefined();
      expect(seq.addWall(1, 2)).toBeUndefined();
      expect(seq.getWalls().length).toBe(1);
    });

    it('normalises endpoint order — addWall(2,1) is the same as addWall(1,2)', () => {
      const seq = new WallNodeSequence();
      seq.addNode(0, 0);
      seq.addNode(100, 0);
      expect(seq.addWall(2, 1)).toBeDefined();
      expect(seq.addWall(1, 2)).toBeUndefined();
    });

    it('records the link on the left node', () => {
      const seq = new WallNodeSequence();
      seq.addNode(0, 0);
      seq.addNode(100, 0);
      seq.addWall(1, 2);
      expect(seq.getWallNodeLinks().get(1)).toEqual([2]);
    });
  });

  describe('remove', () => {
    it('removes an isolated node from both maps', () => {
      const seq = new WallNodeSequence();
      seq.addNode(0, 0);
      seq.remove(1);
      expect(seq.contains(1)).toBe(false);
    });

    it('does not remove a node that has walls attached, and surfaces a notification', () => {
      const seq = new WallNodeSequence();
      seq.addNode(0, 0);
      seq.addNode(100, 0);
      seq.addWall(1, 2);
      seq.remove(1);
      expect(seq.contains(1)).toBe(true);
      expect(showNotification).toHaveBeenCalledTimes(1);
      expect(showNotification.mock.calls[0][0]).toMatchObject({
        color: 'red'
      });
    });

    it('is a no-op when the node id is unknown (guard added by axo-015)', () => {
      const seq = new WallNodeSequence();
      expect(() => seq.remove(999)).not.toThrow();
      expect(showNotification).not.toHaveBeenCalled();
    });
  });

  describe('removeWall', () => {
    it('removes the wall and the link', () => {
      const seq = new WallNodeSequence();
      seq.addNode(0, 0);
      seq.addNode(100, 0);
      seq.addWall(1, 2);
      seq.removeWall(1, 2);
      expect(seq.getWalls().length).toBe(0);
      expect(seq.getWallNodeLinks().get(1)).toEqual([]);
    });

    it('is a no-op when the link does not exist', () => {
      const seq = new WallNodeSequence();
      seq.addNode(0, 0);
      expect(() => seq.removeWall(1, 999)).not.toThrow();
    });
  });

  describe('load', () => {
    it('round-trips nodes and links', () => {
      const seq = new WallNodeSequence();
      seq.load(
        [
          { id: 1, x: 0, y: 0 },
          { id: 2, x: 100, y: 0 },
          { id: 3, x: 100, y: 100 }
        ],
        new Map([
          [1, [2]],
          [2, [3]],
          [3, []]
        ])
      );
      expect(seq.contains(1)).toBe(true);
      expect(seq.contains(2)).toBe(true);
      expect(seq.contains(3)).toBe(true);
      expect(seq.getWalls().length).toBe(2);
    });
  });

  describe('reset', () => {
    it('clears nodes, walls, links, and the static id counter', () => {
      const seq = new WallNodeSequence();
      seq.addNode(0, 0);
      seq.addNode(100, 0);
      seq.addWall(1, 2);
      seq.reset();
      expect(seq.getWalls().length).toBe(0);
      expect(seq.getWallNodes().size).toBe(0);
      expect(seq.getWallNodeLinks().size).toBe(0);
      // Counter restarts at 1 because reset() sets it to 0 and getNewNodeId increments first.
      const a = seq.addNode(0, 0);
      expect(a.getId()).toBe(1);
    });
  });
});
