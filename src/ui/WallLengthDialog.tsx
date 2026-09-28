import { Button, Group, Modal, NumberInput, Stack } from '@mantine/core';
import { useState } from 'react';
import { METER, WALL_THICKNESS } from '../editor/editor/constants';
import { transact } from '../editor/editor/history';
import { resizeAboutMidpoint } from '../editor/editor/keyboardHit';
import type { Wall } from '../editor/editor/objects/Walls/Wall';
import { useStore } from '../stores/EditorStore';
import { useFloorPlanStore } from '../stores/FloorPlanStore';

const close = () => useStore.getState().setLengthEditWall(null);

// The wall label shows the drawn length less one wall thickness, so the typed
// value is read the same way. The wall keeps its midpoint and direction.
function LengthForm({ wall }: { wall: Wall }) {
  const [value, setValue] = useState<number | string>(
    Math.round(((wall.length - WALL_THICKNESS) / METER) * 100) / 100
  );
  const metres = typeof value === 'number' ? value : parseFloat(value);
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
      <Stack>
        <NumberInput
          label="Length (m)"
          value={value}
          onChange={setValue}
          min={0.01}
          step={0.1}
          decimalScale={2}
          data-autofocus
          error={valid ? undefined : 'Enter a length greater than 0'}
        />
        <Group justify="flex-end">
          <Button variant="default" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" disabled={!valid}>
            Apply
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

export function WallLengthDialog() {
  const wall = useStore((s) => s.lengthEditWall);
  return (
    <Modal opened={wall !== null} onClose={close} title="Set wall length">
      {wall && <LengthForm wall={wall} />}
    </Modal>
  );
}
