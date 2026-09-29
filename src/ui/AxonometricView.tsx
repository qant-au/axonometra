import { useMemo, useState } from 'react';
import {
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
import classes from './AxonometricView.module.css';
import { AppDialog } from '../vendor/accurona-ui';

interface Props {
  opened: boolean;
  onClose: () => void;
}

// Read-only axonometric view of the plan.
export function AxonometricView({ opened, onClose }: Props) {
  const [turns, setTurns] = useState(0);
  const [allFloors, setAllFloors] = useState(false);

  // Mounted only while open, and the plan cannot change underneath the
  // dialog, so the scene is read once.
  const [scene] = useState(sceneFromPlan);
  const shown = allFloors
    ? scene.floors
    : scene.floors.slice(scene.current, scene.current + 1);
  const firstLevel = allFloors ? 0 : scene.current;
  const projection = useMemo(
    () => projectScene(shown, turns, firstLevel),
    [shown, turns, firstLevel]
  );

  const wallCount = shown.reduce((n, f) => n + f.walls.length, 0);
  const furnitureCount = shown.reduce((n, f) => n + f.furniture.length, 0);
  const label = `Axonometric view of ${
    allFloors ? `all ${scene.floors.length} floors` : `floor ${scene.current}`
  }: ${wallCount} walls and ${furnitureCount} pieces of furniture, turned ${
    turns * 90
  } degrees.`;

  return (
    <AppDialog
      open={opened}
      onClose={onClose}
      fullScreen
      title="Axonometric view"
    >
      <Stack
        direction="row"
        className={classes.controls}
        sx={{ justifyContent: 'space-between', alignItems: 'center' }}
      >
        <Stack direction="row" spacing={1}>
          <Tooltip title="Turn left">
            <IconButton
              aria-label="Turn left"
              onClick={() => setTurns((t) => (t + 3) % 4)}
            >
              <IconRotate2 />
            </IconButton>
          </Tooltip>
          <Tooltip title="Turn right">
            <IconButton
              aria-label="Turn right"
              onClick={() => setTurns((t) => (t + 1) % 4)}
            >
              <IconRotateClockwise2 />
            </IconButton>
          </Tooltip>
        </Stack>
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
      {wallCount === 0 ? (
        <Typography
          className={classes.empty}
          sx={{ color: 'text.secondary', textAlign: 'center' }}
        >
          Draw some walls on this floor to see them here.
        </Typography>
      ) : (
        <svg
          className={classes.drawing}
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
        </svg>
      )}
    </AppDialog>
  );
}
