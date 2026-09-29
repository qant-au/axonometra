import { Button, Stack, TextField } from '@mui/material';
import { useState } from 'react';
import { METER, WALL_THICKNESS } from '../editor/editor/constants';
import { transact } from '../editor/editor/history';
import { resizeAboutMidpoint } from '../editor/editor/keyboardHit';
import type { Wall } from '../editor/editor/objects/Walls/Wall';
import { useStore } from '../stores/EditorStore';
import { useFloorPlanStore } from '../stores/FloorPlanStore';
import { AppDialog } from '../vendor/accurona-ui';

const close = () => useStore.getState().setLengthEditWall(null);

// The wall label shows the drawn length less one wall thickness, so the typed
// value is read the same way. The wall keeps its midpoint and direction.
function LengthForm({ wall }: { wall: Wall }) {
  const [value, setValue] = useState(
    String(Math.round(((wall.length - WALL_THICKNESS) / METER) * 100) / 100)
  );
  const metres = parseFloat(value);
  const valid = Number.isFinite(metres) && metres > 0;

  const apply = () => {
    if (!valid) return;
    const [a, b] = resizeAboutMidpoint(
      wall.leftNode,
      wall.rightNode,
      metres * METER + WALL_THICKNESS
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
          label="Length (m)"
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          // No min: the browser would refuse to submit 0 with its own
          // message; the error below says what is wrong instead.
          slotProps={{ htmlInput: { step: 0.01 } }}
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
