import { describe, expect, it, vi } from 'vitest';

vi.mock('pixi.js', async () => {
  const { createPixiMock } = await import('../../../test/pixiMock');
  return createPixiMock();
});

const { Preview } = await import('../actions/MeasureToolManager');
const { fakeInstance } = await import('../../../test/fakeInstance');

// The length shown beside the line, as fakeInstance formats it.
const shown = (preview: InstanceType<typeof Preview>) =>
  (
    preview.getReference().children[0] as unknown as {
      text: { text: string };
    }
  ).text.text;

describe('Preview', () => {
  const to = (x: number, y: number) => ({ global: { x, y } }) as never;

  it('measures the line from the press to the mouse', () => {
    const preview = new Preview(fakeInstance());
    preview.set({ x: 0, y: 0 });
    preview.updatePreview(to(300, 400));
    expect(shown(preview)).toBe('500');
  });

  it('reads a wall being drawn as its label will, less 16 cm inside', () => {
    const preview = new Preview(fakeInstance());
    preview.set({ x: 0, y: 0 });
    preview.updatePreview(to(300, 0), true);
    expect(shown(preview)).toBe('284');
  });
});
