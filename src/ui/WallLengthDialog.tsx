import { Button, Stack, TextField } from '@mui/material';
import { useState } from 'react';
import { WALL_THICKNESS } from '../editor/editor/constants';
import { transact } from '../editor/editor/history';
import { resizeAboutMidpoint } from '../editor/editor/keyboardHit';
import { formatPlanLength, parsePlanLength } from '../helpers/planLength';
import type { Wall } from '../editor/editor/objects/Walls/Wall';
import { useStore } from '../stores/EditorStore';
import { useFloorPlanStore } from '../stores/FloorPlanStore';
import { useUnitsStore } from '../stores/UnitsStore';
import { AppDialog } from '../vendor/accurona-ui';

const close = () => useStore.getState().setLengthEditWall(null);

// The wall label shows the drawn length less one wall thickness, so the typed
// value is read the same way. The wall keeps its midpoint and direction.
function LengthForm({ wall }: { wall: Wall }) {
  const units = useUnitsStore((s) => s.units);
  const [value, setValue] = useState(
    formatPlanLength(wall.length - WALL_THICKNESS, { suffix: false })
  );
  // Accepts any unit ('2.7 m', '270 cm', 8'10"); a bare number is in `units`.
  const length = parsePlanLength(value);
  const valid = length !== null && length > 0;

  const apply = () => {
    if (!valid) return;
    const [a, b] = resizeAboutMidpoint(
      wall.leftNode,
      wall.rightNode,
      length + WALL_THICKNESS
    );
    transact(() => {
      wall.leftNode.position.set(a.x, a.y);
      wall.rightNode.position.set(b.x, b.y);
      useFloorPlanStore.getState().redrawWalls();
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
  return (
    <AppDialog open={wall !== null} onClose={close} title="Set wall length">
      {wall && <LengthForm wall={wall} />}
    </AppDialog>
  );
}
