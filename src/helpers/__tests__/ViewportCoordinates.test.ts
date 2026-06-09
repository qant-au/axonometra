import { describe, expect, it, vi } from 'vitest';

// The viewportX / viewportY functions read from the EditorRoot's main
// holder and the EditorStore, both of which require a live Pixi runtime
// and Zustand subscriber. We only smoke-test `snap` here (a pure function);
// viewportX / viewportY get covered by the Playwright e2e suite.

vi.mock('../../editor/EditorRoot', () => ({
  getMain: () => ({ scale: { x: 1, y: 1 }, corner: { x: 0, y: 0 } })
}));
vi.mock('../../stores/EditorStore', () => ({
  useStore: { getState: () => ({ snap: false }) }
}));

const { snap } = await import('../ViewportCoordinates');

describe('snap', () => {
  it('returns the next lower multiple of 10 when remainder < 5', () => {
    expect(snap(13)).toBe(10);
    expect(snap(24)).toBe(20);
  });

  it('returns the next higher multiple of 10 when remainder >= 5', () => {
    expect(snap(15)).toBe(20);
    expect(snap(27)).toBe(30);
  });

  it('returns the value unchanged on multiples of 10', () => {
    expect(snap(0)).toBe(0);
    expect(snap(10)).toBe(10);
    expect(snap(100)).toBe(100);
  });
});
