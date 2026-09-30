import { describe, expect, it, vi } from 'vitest';

vi.mock('pixi.js', async () => {
  const { createPixiMock } = await import('../../../../../test/pixiMock');
  return createPixiMock();
});
vi.mock('../../../../../helpers/isMobile', () => ({ isMobile: false }));

const { Handle, HandleType } = await import('../Handle');
const { fakeInstance } = await import('../../../../../test/fakeInstance');

// A sofa at (100, 50), 200 x 90, not turned.
function target() {
  return {
    x: 100,
    y: 50,
    width: 200,
    height: 90,
    rotation: 0,
    xLocked: false,
    position: { x: 100, y: 50 },
    getGlobalPosition: () => ({ x: 100, y: 50 }),
    getLocalBounds: () => ({ x: 0, y: 0, width: 200, height: 90 }),
    toGlobal: (p: { x: number; y: number }) => ({ x: 100 + p.x, y: 50 + p.y })
  };
}

const press = (x: number, y: number) =>
  ({
    global: { x, y },
    altKey: false,
    stopPropagation: vi.fn()
  }) as never;

describe('Handle.begin: press and drag an item to move it', () => {
  // A catalogue item placed on the plan could not be dragged: only the small
  // move handle at its centre moved it, and that handle appears only once
  // the item is selected (sweep 2026-09-30).
  it('moves the item from a press anywhere on it, until any release', () => {
    const inst = fakeInstance({
      transformDragging: false,
      transformLayer: { update: vi.fn() }
    });
    const handle = new Handle(inst, { type: HandleType.Move });
    const sofa = target();
    handle.setTarget(sofa as never);
    handle.begin(press(120, 60));
    expect(inst.transformDragging).toBe(true);

    handle.emit('globalpointermove', press(170, 90));
    expect(sofa.position).toEqual({ x: 150, y: 80 });

    // Released over something else: the handle never hears its pointerup.
    window.dispatchEvent(new Event('pointerup'));
    expect(inst.transformDragging).toBe(false);
    handle.emit('globalpointermove', press(300, 300));
    expect(sofa.position).toEqual({ x: 150, y: 80 });
  });

  it('is a move handle', () => {
    expect(new Handle(fakeInstance(), { type: HandleType.Move }).kind).toBe(
      HandleType.Move
    );
  });
});
