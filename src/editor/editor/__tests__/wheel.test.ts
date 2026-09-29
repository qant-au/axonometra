import { describe, expect, it } from 'vitest';
import { interpretWheel } from '../wheel';

const ev = (over: Partial<Parameters<typeof interpretWheel>[0]>) => ({
  deltaX: 0,
  deltaY: 0,
  deltaMode: 0,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  ...over
});

describe('interpretWheel', () => {
  it('a plain wheel pans', () => {
    expect(interpretWheel(ev({ deltaY: 30 }))).toEqual({
      kind: 'pan',
      dx: 0,
      dy: 30
    });
  });

  it('line mode is scaled to pixels', () => {
    expect(interpretWheel(ev({ deltaY: 3, deltaMode: 1 }))).toEqual({
      kind: 'pan',
      dx: 0,
      dy: 120
    });
  });

  it('Shift + wheel pans sideways', () => {
    expect(interpretWheel(ev({ deltaY: 30, shiftKey: true }))).toEqual({
      kind: 'pan',
      dx: 30,
      dy: 0
    });
    // Already sideways: left alone.
    expect(interpretWheel(ev({ deltaX: 30, shiftKey: true }))).toEqual({
      kind: 'pan',
      dx: 30,
      dy: 0
    });
  });

  it('Ctrl or Cmd + wheel zooms, and in and out cancel', () => {
    const zoomIn = interpretWheel(ev({ deltaY: -100, ctrlKey: true }));
    const zoomOut = interpretWheel(ev({ deltaY: 100, metaKey: true }));
    expect(zoomIn.kind).toBe('zoom');
    expect(zoomOut.kind).toBe('zoom');
    if (zoomIn.kind !== 'zoom' || zoomOut.kind !== 'zoom') return;
    expect(zoomIn.factor).toBeGreaterThan(1);
    expect(zoomIn.factor * zoomOut.factor).toBeCloseTo(1);
  });
});
