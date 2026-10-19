import { Button, Stack, TextField } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { AppDialog } from './kit';
import { useStore } from '../stores/EditorStore';
import { useInstance } from '../editor/instance/context';
import { useUnitsStore } from '../stores/UnitsStore';
import { METER, WALL_HEIGHT } from '../editor/editor/constants';
import { wallHeightError } from '../editor/mountEdit';

// The current floor's wall height, floor to ceiling. Only the floor's value
// changes: a ceiling item keeps its gap below the ceiling and moves with it,
// and what stands on it follows. Lengths are typed as in the wall-length
// dialog.
function HeightForm({ close }: { close: () => void }) {
  const inst = useInstance();
  const units = useUnitsStore((s) => s.units);
  const floor = inst.plan.getState().getCurrentFloor();
  const current =
    floor.wallHeightM != null ? floor.wallHeightM * METER : WALL_HEIGHT;
  const [value, setValue] = useState(
    inst.formatLength(current, { suffix: false })
  );
  const height = inst.parseLength(value);
  const error =
    height === null
      ? 'Enter a length, e.g. 2.7 m'
      : wallHeightError(height, floor.getFurniture().values());
  // autoFocus alone loses the input in development (see WallLengthDialog).
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => inputRef.current?.focus(), []);

  const apply = () => {
    if (error || height === null) return;
    // Unchanged, it records nothing and leaves a default unwritten.
    if (Math.abs(height - current) > 1e-6) {
      inst.edits.transact(() => {
        floor.wallHeightM = Math.round((height / METER) * 1e5) / 1e5;
      });
    }
    close();
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        apply();
      }}
    >
      <Stack spacing={2} sx={{ pt: 1 }}>
        <TextField
          label={`Wall height (${units})`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          slotProps={{
            htmlInput: {
              inputMode:
                units === 'in' || units === 'ft-in' ? 'text' : 'decimal'
            }
          }}
          autoFocus
          inputRef={inputRef}
          error={error !== null}
          helperText={
            error ?? 'Floor to ceiling. Ceiling items keep their gap below it'
          }
        />
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
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

export function WallHeightDialog() {
  const open = useStore((s) => s.wallHeightOpen);
  const setOpen = useStore((s) => s.setWallHeightOpen);
  const close = () => setOpen(false);
  return (
    <AppDialog open={open} onClose={close} title="Set wall height">
      {open && <HeightForm close={close} />}
    </AppDialog>
  );
}
