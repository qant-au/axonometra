import { useState } from 'react';
import { ContextMenu, type ContextMenuItem } from '@accurona/ui';
import type { EditorInstance } from '../editor/instance/EditorInstance';
import { useInstance } from '../editor/instance/context';
import { useContextMenuStore } from '../editor/editor/selection/pointer';
import type { SelectionRef } from '../editor/editor/selection/planOps';
import { objectPlaces } from '../editor/editor/persistence/crossover';

// An item that is also a node in a network diagram says which ones.
function diagramItems(
  inst: EditorInstance,
  furnitureId: number
): ContextMenuItem[] {
  const objectId = inst.serializer.objectIdOf(furnitureId);
  if (!objectId) return [];
  const diagrams = objectPlaces(inst.serializer.openedScene(), objectId)
    .filter((place) => place.kind !== 'plan')
    .map((place) => place.viewName);
  if (!diagrams.length) return [];
  return [
    {
      label: 'In the network diagram',
      onClick: () =>
        inst.notify({
          title: 'In the network diagram',
          message: diagrams.join(', '),
          severity: 'info'
        })
    }
  ];
}

function itemsFor(
  inst: EditorInstance,
  ref: SelectionRef | null
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
    },
    ...diagramItems(inst, ref.id)
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
  const items = itemsFor(inst, menu.ref).map((item) => ({
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
