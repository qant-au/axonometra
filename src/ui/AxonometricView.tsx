import { useMemo, useState } from 'react';
import {
  Box,
  FormControlLabel,
  IconButton,
  Stack,
  Switch,
  Tooltip,
  Typography
} from '@mui/material';
import { IconRotate2, IconRotateClockwise2 } from '@tabler/icons-react';
import { projectScene } from '../editor/axonometric/axonometric';
import { sceneFromPlan } from '../editor/axonometric/sceneFromPlan';
import { useInstance } from '../editor/instance/context';
import { AppDialog } from './kit';
import { wallsAndFurniture } from '../helpers/counted';

interface Props {
  opened: boolean;
  onClose: () => void;
}

// Read-only axonometric view of the plan.
export function AxonometricView({ opened, onClose }: Props) {
  const [turns, setTurns] = useState(0);
  const [allFloors, setAllFloors] = useState(false);
  const [hideCeiling, setHideCeiling] = useState(false);

  // Mounted only while open, and the plan cannot change underneath the
  // dialog, so the scene is read once.
  const inst = useInstance();
  const [scene] = useState(() => sceneFromPlan(inst));
  const shown = allFloors
    ? scene.floors
    : scene.floors.slice(scene.current, scene.current + 1);
  const firstLevel = allFloors ? 0 : scene.current;
  const projection = useMemo(
    () => projectScene(shown, turns, firstLevel, { hideCeiling }),
    [shown, turns, firstLevel, hideCeiling]
  );
  const ceilingCount = shown.reduce(
    (n, f) => n + f.furniture.filter((item) => item.ceiling).length,
    0
  );

  const wallCount = shown.reduce((n, f) => n + f.walls.length, 0);
  // Doors and windows sit in their walls and are not furniture: counted as
  // the 3D view counts them.
  const furnitureCount = shown.reduce(
    (n, f) =>
      n +
      f.furniture.filter((item) => !item.wall && !(hideCeiling && item.ceiling))
        .length,
    0
  );
  const label = `Axonometric view of ${
    allFloors ? `all ${scene.floors.length} floors` : `floor ${scene.current}`
  }: ${wallsAndFurniture(wallCount, furnitureCount)}${
    hideCeiling && ceilingCount > 0
      ? `, ${ceilingCount} ceiling item${ceilingCount === 1 ? '' : 's'} hidden`
      : ''
  }, turned ${turns * 90} degrees.`;

  return (
    <AppDialog
      open={opened}
      onClose={onClose}
      fullScreen
      title="Axonometric view"
    >
      <Stack
        direction="row"
        sx={{
          flex: 'none',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <Stack direction="row" spacing={1}>
          <Tooltip title="Turn left">
            <IconButton
              aria-label="Turn left"
              onClick={() => setTurns((t) => (t + 3) % 4)}
            >
              <IconRotate2 aria-hidden />
            </IconButton>
          </Tooltip>
          <Tooltip title="Turn right">
            <IconButton
              aria-label="Turn right"
              onClick={() => setTurns((t) => (t + 1) % 4)}
            >
              <IconRotateClockwise2 aria-hidden />
            </IconButton>
          </Tooltip>
        </Stack>
        <Stack direction="row" spacing={1}>
          <FormControlLabel
            label="Hide ceiling items"
            control={
              <Switch
                checked={hideCeiling}
                onChange={(e) => setHideCeiling(e.currentTarget.checked)}
              />
            }
          />
          {scene.floors.length > 1 && (
            <FormControlLabel
              label="All floors"
              control={
                <Switch
                  checked={allFloors}
                  onChange={(e) => setAllFloors(e.currentTarget.checked)}
                />
              }
            />
          )}
        </Stack>
      </Stack>
      {wallCount === 0 ? (
        <Typography
          sx={{ mt: '20vh', color: 'text.secondary', textAlign: 'center' }}
        >
          Draw some walls on this floor to see them here.
        </Typography>
      ) : (
        <Box
          component="svg"
          sx={{
            flex: 1,
            minHeight: 0,
            width: '100%',
            background: '#fafaf8',
            '& polygon': {
              stroke: '#5f5a50',
              strokeWidth: 1,
              strokeLinejoin: 'round',
              vectorEffect: 'non-scaling-stroke'
            },
            '& polyline': {
              fill: 'none',
              stroke: '#3d3a33',
              strokeWidth: 1.5,
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
              vectorEffect: 'non-scaling-stroke'
            }
          }}
          viewBox={projection.viewBox.join(' ')}
          role="img"
          aria-label={label}
        >
          {projection.faces.map((face, i) => (
            <polygon
              key={i}
              points={face.points.map(([x, y]) => `${x},${y}`).join(' ')}
              fill={face.fill}
            />
          ))}
          {projection.marks.map((mark, i) => (
            <polyline
              key={`m${i}`}
              data-facing="down"
              points={mark.map(([x, y]) => `${x},${y}`).join(' ')}
            />
          ))}
        </Box>
      )}
    </AppDialog>
  );
}
