import { useMemo } from 'react';
import {
  AXONOMETRA_WALK_KEYS,
  DIFFERENCES,
  shortcutSections
} from '@accurona/core';
import { KeyboardShortcutsDialog } from '@accurona/ui';
import { KEYMAP } from '../editor/keymap';
import { useStore } from '../stores/EditorStore';

// The `?` list: the shared keymap's table (the same one the key handler
// binds), plus the keyboard cursor and walk mode, which have keys of their
// own, and the Excalidraw bindings Axonometra deliberately does not match.
export function ShortcutsDialog() {
  const open = useStore((s) => s.shortcutsOpen);
  const setOpen = useStore((s) => s.setShortcutsOpen);
  const sections = useMemo(
    () => [
      ...shortcutSections(KEYMAP),
      {
        title: 'Keyboard cursor (canvas focused from the keyboard)',
        rows: [
          { label: 'Move the cursor', keys: ['Arrow keys; with Shift, 1 m'] },
          { label: 'Use the tool at the cursor', keys: ['Enter', 'Space'] },
          { label: "Type the wall's length", keys: ['Ctrl/Cmd + Enter'] },
          { label: 'Cancel', keys: ['Esc'] }
        ]
      },
      {
        title: 'Walk mode (3D)',
        rows: AXONOMETRA_WALK_KEYS.map((k) => ({
          label: k.label,
          keys: [k.keys]
        }))
      }
    ],
    []
  );
  if (!open) return null;
  return (
    <KeyboardShortcutsDialog
      open
      onClose={() => setOpen(false)}
      sections={sections}
      differences={DIFFERENCES.axonometra}
    />
  );
}
