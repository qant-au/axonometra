import { useState } from 'react';
import { ContextMenu, type ContextMenuItem } from '../vendor/accurona-ui';
import { useStore } from '../stores/EditorStore';
import { useFloorPlanStore } from '../stores/FloorPlanStore';
import { embedConfig } from '../embed/embedConfig';
import { transact } from '../editor/editor/history';
import { useContextMenuStore } from '../editor/editor/selection/pointer';
import {
  copySelection,
  cutSelection,
  deleteSelection,
  duplicateSelection,
  fitAll,
  hasClipboard,
  paste,
  selectAll
} from '../editor/editor/selection/commands';
import type { SelectionRef } from '../editor/editor/selection/planOps';

function itemsFor(ref: SelectionRef | null): ContextMenuItem[] {
  const view: ContextMenuItem = { label: 'Fit everything', onClick: fitAll };
  if (embedConfig.readonly) return [view];
  if (ref === null) {
    return [
      ...(hasClipboard() ? [{ label: 'Paste', onClick: () => paste() }] : []),
      { label: 'Select all', onClick: selectAll },
      view
    ];
  }
  const edit: ContextMenuItem[] = [
    { label: 'Copy', onClick: () => copySelection() },
    { label: 'Cut', onClick: () => cutSelection() },
    { label: 'Duplicate', onClick: () => duplicateSelection() },
    { label: 'Delete', onClick: () => deleteSelection() }
  ];
  const plan = useFloorPlanStore.getState();
  if (ref.kind === 'wall') {
    const wall = plan.getWallNodeSeq().getWall(ref.left, ref.right);
    if (!wall) return edit;
    return [
      ...edit,
      {
        label: 'Edit length',
        onClick: () => useStore.getState().setLengthEditWall(wall)
      },
      {
        // Was a bare right-click before the menu.
        label: wall.isExteriorWall ? 'Make interior' : 'Make exterior',
        onClick: () => transact(() => wall.toggleExterior())
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
    }
  ];
}

// The right-click menu on the plan (shared keymap: right-click opens it). A
// point-sized anchor at the click gives the menu somewhere to open from.
export function PlanContextMenu() {
  const menu = useContextMenuStore((s) => s.menu);
  const close = useContextMenuStore((s) => s.close);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  if (!menu) return null;
  const items = itemsFor(menu.ref).map((item) => ({
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
          position={{ x: menu.x, y: menu.y }}
          anchorEl={anchor}
          onClose={close}
          items={items}
        />
      )}
    </>
  );
}
