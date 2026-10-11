import { Button, MenuItem, Stack, TextField } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import type { Facing, MountFrom } from '@accurona/core';
import { AppDialog } from '@accurona/ui';
import { useStore } from '../stores/EditorStore';
import { useInstance } from '../editor/instance/context';
import { useUnitsStore } from '../stores/UnitsStore';
import type { Furniture } from '../editor/editor/objects/Furniture';
import { METER, WALL_HEIGHT } from '../editor/editor/constants';
import {
  applyMounting,
  commonMounting,
  defaultMounting,
  mountingError,
  type MountingEdit
} from '../editor/mountEdit';

// A field the selected items disagree on shows empty and keeps each item's.
const MIXED = '';

// Set what a placed item's height is measured from, that height, its own
// height and which way it faces (scene format version 2). Lengths are typed
// and shown as in the wall-length dialog.
function MountingForm({
  items,
  close
}: {
  items: Furniture[];
  close: () => void;
}) {
  const inst = useInstance();
  const units = useUnitsStore((s) => s.units);
  const show = (length: number | null) =>
    length == null ? MIXED : inst.formatLength(length, { suffix: false });
  const fill = (m: MountingEdit) => ({
    mountFrom: m.mountFrom ?? MIXED,
    offset: show(m.offset),
    height: show(m.height),
    facing: m.facing ?? MIXED
  });
  const [form, setForm] = useState(() => fill(commonMounting(items)));
  const set = (field: keyof typeof form) => (value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  // An empty length keeps each item's own; anything else must parse.
  const length = (text: string) =>
    text.trim() === MIXED ? null : inst.parseLength(text);
  const edit: MountingEdit = {
    mountFrom: (form.mountFrom || null) as MountFrom | null,
    offset: length(form.offset),
    height: length(form.height),
    facing: (form.facing || null) as Facing | null
  };
  const unreadable =
    (form.offset.trim() !== MIXED && edit.offset === null) ||
    (form.height.trim() !== MIXED && edit.height === null);
  const error = unreadable
    ? 'Enter a length, e.g. 2.4 m'
    : mountingError(edit, items);

  // A support is chosen by dropping the item on it, which is not built yet,
  // so 'Another item' is only offered to items a scene file put on one.
  const onSurface = items.every((i) => i.mountFrom === 'surface');
  const fromCeiling = form.mountFrom === 'ceiling';

  // Between floor and ceiling the item stays where it is: the height above
  // the floor becomes the gap below the ceiling, and back.
  const changeMountFrom = (to: string) => {
    const wasCeiling = form.mountFrom === 'ceiling';
    const toCeiling = to === 'ceiling';
    const { offset, height } = edit;
    if (wasCeiling === toCeiling || offset == null || height == null) {
      set('mountFrom')(to);
      return;
    }
    const floor = inst.plan.getState().getCurrentFloor();
    const ceiling =
      floor.wallHeightM != null ? floor.wallHeightM * METER : WALL_HEIGHT;
    setForm((f) => ({
      ...f,
      mountFrom: to,
      offset: show(Math.max(0, ceiling - offset - height))
    }));
  };

  // autoFocus alone loses the input in development (see WallLengthDialog).
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => inputRef.current?.focus(), []);

  const reset = () => {
    // The element's own values; mixed elements show which ones differ.
    const defaults = items.map((i) => defaultMounting(i.resourcePath));
    const agreed = <K extends keyof (typeof defaults)[0]>(key: K) =>
      defaults.every((d) => d[key] === defaults[0][key])
        ? defaults[0][key]
        : null;
    setForm(
      fill({
        mountFrom: agreed('mountFrom'),
        offset: agreed('offset'),
        height: agreed('height'),
        facing: agreed('facing')
      })
    );
  };

  const apply = () => {
    if (error) return;
    inst.edits.transact(() => {
      for (const item of items) applyMounting(item, edit);
    });
    close();
  };

  const inputMode = units === 'in' || units === 'ft-in' ? 'text' : 'decimal';
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        apply();
      }}
    >
      <Stack spacing={2} sx={{ pt: 1 }}>
        <TextField
          select
          label="Mounted on"
          value={form.mountFrom}
          onChange={(e) => changeMountFrom(e.target.value)}
        >
          {form.mountFrom === MIXED && (
            <MenuItem value={MIXED}>Mixed (each keeps its own)</MenuItem>
          )}
          <MenuItem value="floor">Floor</MenuItem>
          <MenuItem value="ceiling">Ceiling</MenuItem>
          <MenuItem value="surface" disabled={!onSurface}>
            Another item
          </MenuItem>
        </TextField>
        <TextField
          label={`${
            fromCeiling ? 'Gap below the ceiling' : 'Height above the floor'
          } (${units})`}
          value={form.offset}
          onChange={(e) => set('offset')(e.target.value)}
          placeholder={form.offset === MIXED ? 'Mixed' : undefined}
          slotProps={{ htmlInput: { inputMode } }}
          autoFocus
          inputRef={inputRef}
          helperText={
            fromCeiling
              ? "To the item's top: 0 is flush, below 0 is recessed"
              : "To the item's underside"
          }
        />
        <TextField
          label={`Item height (${units})`}
          value={form.height}
          onChange={(e) => set('height')(e.target.value)}
          placeholder={form.height === MIXED ? 'Mixed' : undefined}
          slotProps={{ htmlInput: { inputMode } }}
        />
        <TextField
          select
          label="Facing"
          value={form.facing}
          onChange={(e) => set('facing')(e.target.value)}
          error={error !== null}
          helperText={error ?? undefined}
        >
          {form.facing === MIXED && (
            <MenuItem value={MIXED}>Mixed (each keeps its own)</MenuItem>
          )}
          <MenuItem value="up">Up</MenuItem>
          <MenuItem value="down">Down</MenuItem>
        </TextField>
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
          <Button variant="text" onClick={reset} sx={{ mr: 'auto' }}>
            Reset to default
          </Button>
          <Button variant="outlined" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" disabled={error !== null}>
            Apply
          </Button>
        </Stack>
      </Stack>
    </form>
  );
}

export function MountingDialog() {
  const inst = useInstance();
  const ids = useStore((s) => s.mountEditIds);
  const setMountEditIds = useStore((s) => s.setMountEditIds);
  const close = () => setMountEditIds(null);
  const plan = inst.plan.getState();
  const items = (ids ?? []).flatMap((id) => {
    const item = plan.getObject(id);
    return item ? [item] : [];
  });
  const open = items.length > 0;
  return (
    <AppDialog
      open={open}
      onClose={close}
      title={
        items.length > 1
          ? `Height and mounting: ${items.length} items`
          : 'Height and mounting'
      }
    >
      {open && <MountingForm items={items} close={close} />}
    </AppDialog>
  );
}
