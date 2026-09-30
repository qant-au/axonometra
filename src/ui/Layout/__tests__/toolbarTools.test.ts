import { describe, expect, it } from 'vitest';
import { TOOL_FOR_ACTION } from '../../../editor/keymap';
import { SHOWN_TOOLS } from '../toolbarTools';

// Re-sweep 2026-09-30: L / 6, D, W and M took their tools with no toolbar
// button showing it.
describe('the tool bar', () => {
  it('shows every tool a key can take', () => {
    for (const tool of Object.values(TOOL_FOR_ACTION)) {
      expect(SHOWN_TOOLS).toContain(tool);
    }
  });
});
