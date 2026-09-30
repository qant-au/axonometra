import { describe, expect, it, vi } from 'vitest';

vi.mock('pixi.js', async () => {
  const { createPixiMock } = await import('../../../test/pixiMock');
  return createPixiMock();
});

const { AddNodeAction } = await import('../actions/AddNodeAction');
const { fakeInstance } = await import('../../../test/fakeInstance');

// Re-sweep 2026-09-30: with snap on, the node a click makes sits off the
// pointer, so a double click's second press could miss it and do nothing,
// leaving the chain (and its hint) running.
describe('AddNodeAction on the chain’s last node', () => {
  function setup() {
    const last = { x: 200, y: 100 };
    const step = vi.fn();
    const addNode = vi.fn();
    const addNodeToWall = vi.fn();
    const inst = fakeInstance({
      editor: { getState: () => ({ snap: false }) },
      plan: { getState: () => ({ addNode, addNodeToWall }) },
      addWallManager: {
        previousNode: last,
        step,
        checkStep: () => false
      }
    });
    return { inst, last, step, addNode, addNodeToWall };
  }

  it('ends the chain on a press on the plan beside it', () => {
    const { inst, last, step, addNode } = setup();
    new AddNodeAction(inst, undefined, { x: 207, y: 104 }).execute();
    expect(step).toHaveBeenCalledWith(last);
    expect(addNode).not.toHaveBeenCalled();
  });

  it('ends the chain on a press on the wall just drawn, at its end', () => {
    const { inst, last, step, addNodeToWall } = setup();
    new AddNodeAction(inst, {} as never, { x: 195, y: 100 }).execute();
    expect(step).toHaveBeenCalledWith(last);
    expect(addNodeToWall).not.toHaveBeenCalled();
  });

  it('adds a node further away', () => {
    const { inst, step, addNodeToWall } = setup();
    addNodeToWall.mockReturnValue({ id: 9 });
    new AddNodeAction(inst, {} as never, { x: 600, y: 100 }).execute();
    expect(addNodeToWall).toHaveBeenCalled();
    expect(step).toHaveBeenCalledWith({ id: 9 });
  });
});
