import { describe, expect, it } from 'vitest';
import {
  CEILING_ALPHA,
  heightTag,
  isCeilingItem,
  planStyle,
  shownOn,
  type LayeredItem
} from '../planLayers';
import { nextInStack } from '../editor/selection/pointer';

// Catalogue ids are real: a smoke detector hangs flush from the ceiling, a
// PIR sensor sits 240 cm up a wall, a table stands on the floor.
const item = (resourcePath: string, own: Partial<LayeredItem> = {}) => ({
  resourcePath,
  isAttached: false,
  ...own
});
const cm = (length: number) => `${Math.round(length)} cm`;

describe('the plan layers', () => {
  it("puts an item on the ceiling layer by its own reference, else its element's", () => {
    expect(isCeilingItem(item('smoke-detector'))).toBe(true);
    expect(isCeilingItem(item('pir-sensor'))).toBe(false);
    // An offset alone is from the floor, as before scene version 2.
    expect(isCeilingItem(item('smoke-detector', { mountM: 2.2 }))).toBe(false);
    expect(
      isCeilingItem(item('pir-sensor', { mountFrom: 'ceiling', mountM: 0 }))
    ).toBe(true);
    // A door or window is in its wall, never on the ceiling.
    expect(isCeilingItem(item('smoke-detector', { isAttached: true }))).toBe(
      false
    );
  });

  it('shows both layers, the floor alone, or the ceiling alone', () => {
    expect(shownOn('both', true) && shownOn('both', false)).toBe(true);
    expect([shownOn('floor', false), shownOn('floor', true)]).toEqual([
      true,
      false
    ]);
    expect([shownOn('ceiling', false), shownOn('ceiling', true)]).toEqual([
      false,
      true
    ]);
  });

  it('draws ceiling items lighter only over the floor items', () => {
    expect(planStyle('both', true)).toEqual({
      visible: true,
      alpha: CEILING_ALPHA
    });
    expect(planStyle('both', false)).toEqual({ visible: true, alpha: 1 });
    expect(planStyle('ceiling', true)).toEqual({ visible: true, alpha: 1 });
    expect(planStyle('floor', true).visible).toBe(false);
  });

  it('tags an item off the floor with its height', () => {
    expect(heightTag(item('smoke-detector'), cm)).toBe('C');
    expect(
      heightTag(item('pir-sensor', { mountFrom: 'ceiling', mountM: 0.3 }), cm)
    ).toBe('C -30 cm');
    // Recessed into the ceiling reads as flush with it.
    expect(
      heightTag(item('pir-sensor', { mountFrom: 'ceiling', mountM: -0.1 }), cm)
    ).toBe('C');
    expect(heightTag(item('pir-sensor'), cm)).toBe('+240 cm');
    expect(heightTag(item('pir-sensor', { mountM: 1.1 }), cm)).toBe('+110 cm');
    expect(heightTag(item('table'), cm)).toBeNull();
    expect(heightTag(item('pir-sensor', { isAttached: true }), cm)).toBeNull();
  });
});

describe('clicking through overlapping items', () => {
  it('selects the one under the selected one, then round to the top', () => {
    // A downlight (1) over a table (2) over a rug (3).
    expect(nextInStack([1, 2, 3], 1)).toBe(2);
    expect(nextInStack([1, 2, 3], 2)).toBe(3);
    expect(nextInStack([1, 2, 3], 3)).toBe(1);
  });
});
