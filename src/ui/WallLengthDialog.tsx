import { Button, Stack, TextField } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { resizeAboutMidpoint } from '../editor/editor/keyboardHit';
import type { Wall } from '../editor/editor/objects/Walls/Wall';
import { useStore } from '../stores/EditorStore';
import { useInstance } from '../editor/instance/context';
import { useUnitsStore } from '../stores/UnitsStore';
import { AppDialog } from '@accurona/ui';

// The wall label shows the drawn length less the wall's thickness, so the
// typed value is read the same way. The wall keeps its midpoint and direction.
function LengthForm({ wall, close }: { wall: Wall; close: () => void }) {
  const inst = useInstance();
  const units = useUnitsStore((s) => s.units);
  const [value, setValue] = useState(
    inst.formatLength(wall.shownLength(), { suffix: false })
  );
  // Accepts any unit ('2.7 m', '270 cm', 8'10"); a bare number is in `units`.
  const length = inst.parseLength(value);
  const valid = length !== null && length > 0;
  // autoFocus alone loses the input in development: StrictMode re-runs MUI's
  // focus trap, which hands focus back to the canvas and then to the dialog.
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => inputRef.current?.focus(), []);

  const apply = () => {
    if (!valid) return;
    const [a, b] = resizeAboutMidpoint(
      wall.leftNode,
      wall.rightNode,
      length + wall.thickness
    );
    inst.edits.transact(() => {
      wall.leftNode.position.set(a.x, a.y);
      wall.rightNode.position.set(b.x, b.y);
      inst.plan.getState().redrawWalls();
    });
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
          label={`Length (${units})`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          // Text, not number: a unit may be typed after the value, and
          // feet and inches need their marks, which a decimal keypad lacks.
          slotProps={{
            htmlInput: {
              inputMode:
                units === 'in' || units === 'ft-in' ? 'text' : 'decimal'
            }
          }}
          autoFocus
          inputRef={inputRef}
          error={!valid}
          helperText={valid ? undefined : 'Enter a length greater than 0'}
        />
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
          <Button variant="outlined" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" disabled={!valid}>
            Apply
          </Button>
        </Stack>
      </Stack>
    </form>
  );
}

export function WallLengthDialog() {
  const wall = useStore((s) => s.lengthEditWall);
  const setLengthEditWall = useStore((s) => s.setLengthEditWall);
  const close = () => setLengthEditWall(null);
  return (
    <AppDialog open={wall !== null} onClose={close} title="Set wall length">
      {wall && <LengthForm wall={wall} close={close} />}
    </AppDialog>
  );
}
