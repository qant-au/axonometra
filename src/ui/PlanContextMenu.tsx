import { useState } from 'react';
import { ContextMenu, type ContextMenuItem } from './kit';
import type { EditorInstance } from '../editor/instance/EditorInstance';
import { useInstance } from '../editor/instance/context';
import { useContextMenuStore } from '../editor/editor/selection/pointer';
import { sameRef, type SelectionRef } from '../editor/editor/selection/planOps';
import { mountTargets } from '../editor/mountEdit';

// The walls a wall's menu item applies to: every selected wall, or the one
// right-clicked when it is not in the selection.
function wallTargets(inst: EditorInstance, clicked: SelectionRef) {
  const seq = inst.plan.getState().getWallNodeSeq();
  const walls = inst.selection.getState().refs.filter((r) => r.kind === 'wall');
  const refs = walls.some((r) => sameRef(r, clicked)) ? walls : [clicked];
  return refs.flatMap((r) => {
    const wall = r.kind === 'wall' ? seq.getWall(r.left, r.right) : undefined;
    return wall ? [wall] : [];
  });
}

function itemsFor(
  inst: EditorInstance,
  ref: SelectionRef | null,
  at?: { x: number; y: number }
): ContextMenuItem[] {
  const {
    copySelection,
    cutSelection,
    deleteSelection,
    duplicateSelection,
    fitAll,
    hasClipboard,
    paste,
    selectAll
  } = inst.commands;
  const transact = inst.edits.transact;
  const view: ContextMenuItem = { label: 'Fit everything', onClick: fitAll };
  if (inst.config.readOnly) return [view];
  if (ref === null) {
    return [
      ...(hasClipboard() ? [{ label: 'Paste', onClick: () => paste(at) }] : []),
      { label: 'Select all', onClick: selectAll },
      {
        label: 'Wall height...',
        onClick: () => inst.editor.getState().setWallHeightOpen(true)
      },
      view
    ];
  }
  const edit: ContextMenuItem[] = [
    { label: 'Copy', onClick: () => copySelection() },
    { label: 'Cut', onClick: () => cutSelection() },
    { label: 'Duplicate', onClick: () => duplicateSelection() },
    { label: 'Delete', onClick: () => deleteSelection() }
  ];
  const plan = inst.plan.getState();
  if (ref.kind === 'wall') {
    const wall = plan.getWallNodeSeq().getWall(ref.left, ref.right);
    if (!wall) return edit;
    return [
      ...edit,
      {
        label: 'Edit length',
        onClick: () => inst.editor.getState().setLengthEditWall(wall)
      },
      {
        // Was a bare right-click before the menu. Like Copy and Delete, it
        // takes every selected wall when the one clicked is among them.
        label: wall.isExteriorWall ? 'Make interior' : 'Make exterior',
        onClick: () => {
          const exterior = !wall.isExteriorWall;
          transact(() => {
            for (const w of wallTargets(inst, ref)) w.setIsExterior(exterior);
          });
        }
      }
    ];
  }
  const furniture = plan.getObject(ref.id);
  if (!furniture) return edit;
  return [
    ...edit,
    // Was a bare right-click before the menu.
    {
      label: 'Turn',
      onClick: () => transact(() => furniture.switchOrientation())
    },
    // Doors and windows sit in their walls.
    ...(furniture.isAttached
      ? []
      : [
          {
            label: 'Height and mounting...',
            onClick: () =>
              inst.editor.getState().setMountEditIds(mountTargets(inst, ref.id))
          }
        ])
  ];
}

// The right-click menu on the plan (shared keymap: right-click opens it). A
// point-sized anchor at the click gives the menu somewhere to open from.
export function PlanContextMenu() {
  const inst = useInstance();
  const menu = useContextMenuStore((s) => s.menu);
  const close = useContextMenuStore((s) => s.close);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  if (!menu) return null;
  const items = itemsFor(inst, menu.ref, menu.at).map((item) => ({
    ...item,
    onClick: () => {
      close();
      item.onClick();
    }
  }));
  return (
    <>
      <div
        ref={setAnchor}
        style={{ position: 'fixed', left: menu.x, top: menu.y }}
      />
      {anchor && (
        <ContextMenu
          // An offset from the anchor, which already sits at the click.
          position={{ x: 0, y: 0 }}
          anchorEl={anchor}
          onClose={close}
          items={items}
        />
      )}
    </>
  );
}
