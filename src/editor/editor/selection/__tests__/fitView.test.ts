import { describe, expect, it, vi } from 'vitest';
import { fitView } from '../commands';
import { EditorInstance } from '../../../instance/EditorInstance';
import type { Main } from '../../Main';

describe('fitView', () => {
  const screen = { width: 1440, height: 900, left: 70 };

  it('fits a wide plan into the screen beside the tool bar, with a margin', () => {
    // 42 m wide (a scene of 32 items in a row): 43 m with the margin.
    const view = fitView({ x: 0, y: 0, width: 4200, height: 1400 }, screen);
    expect(view.scale).toBeCloseTo((1440 - 70) / 4300);
    expect(4300 * view.scale).toBeLessThanOrEqual(1440 - 70);
  });

  it('fits a tall plan by its height', () => {
    const view = fitView({ x: 0, y: 0, width: 400, height: 3000 }, screen);
    expect(view.scale).toBeCloseTo(900 / 3100);
  });

  it('centres in the part of the screen the tool bar leaves', () => {
    expect(fitView({ x: 0, y: 0, width: 400, height: 300 }, screen).shift).toBe(
      35
    );
    expect(
      fitView({ x: 0, y: 0, width: 400, height: 300 }, { ...screen, left: 0 })
        .shift
    ).toBe(0);
  });
});

describe('EditorInstance.frameAll', () => {
  it('waits for the canvas when a plan is loaded before it is ready', () => {
    const inst = new EditorInstance();
    const fit = vi.spyOn(inst.commands, 'fitAll').mockReturnValue(true);
    inst.frameAll();
    expect(fit).not.toHaveBeenCalled();
    expect(inst.frameOnSetup).toBe(true);

    inst.main = { ready: true } as unknown as Main;
    inst.frameAll();
    expect(fit).toHaveBeenCalledOnce();
    expect(inst.frameOnSetup).toBe(false);
  });
});
