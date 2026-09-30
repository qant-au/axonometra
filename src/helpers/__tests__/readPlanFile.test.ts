import { describe, expect, it, vi } from 'vitest';
import { readPlanFile } from '../readPlanFile';

describe('readPlanFile', () => {
  it('tells the given notifier about a file of the wrong type', async () => {
    const notify = vi.fn();
    const file = new File(['x'], 'plan.png', { type: 'image/png' });
    expect(await readPlanFile(file, notify)).toBeNull();
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Unsupported file' })
    );
  });

  it('tells the given notifier about a file over 5 MB', async () => {
    const notify = vi.fn();
    const file = new File(['x'.repeat(5 * 1024 * 1024 + 1)], 'plan.json');
    expect(await readPlanFile(file, notify)).toBeNull();
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'File too large' })
    );
  });

  it('returns the text of a plan file and says nothing', async () => {
    const notify = vi.fn();
    const file = new File(['{"a":1}'], 'plan.json');
    expect(await readPlanFile(file, notify)).toBe('{"a":1}');
    expect(notify).not.toHaveBeenCalled();
  });
});
