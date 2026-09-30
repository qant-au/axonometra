import { wallsAndFurniture } from '../helpers/counted';
import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  FormControlLabel,
  IconButton,
  Stack,
  Switch,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  useMediaQuery
} from '@mui/material';
import {
  IconArrowUp,
  IconDownload,
  IconFileDownload,
  IconPhotoDown,
  IconFocusCentered,
  IconRotate2,
  IconRotateClockwise2,
  IconStairsDown,
  IconStairsUp,
  IconZoomIn,
  IconZoomOut
} from '@tabler/icons-react';
import {
  Color,
  DirectionalLight,
  HemisphereLight,
  Object3D,
  PerspectiveCamera,
  Scene,
  Spherical,
  Vector3,
  WebGLRenderer
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import saveAs from 'file-saver';
import { timestamp } from '../editor/editor/actions/SaveAction';
import { METER } from '../editor/editor/constants';
import { AppDialog } from '@accurona/ui';
import type { FloorPlanSerializable } from '../editor/editor/persistence/FloorPlanSerializable';
import { useInstance } from '../editor/instance/context';
import { sceneModel } from '../editor/scene3d/sceneModel';
import { buildGroup } from '../editor/scene3d/threeScene';
import { exportGlb } from '../editor/scene3d/exportGlb';
import { floorInput } from '../editor/scene3d/fromPlan';
import { floorGeometry, type Point } from '../editor/scene3d/geometry';
import {
  arrival,
  atStairs,
  canChangeFloor,
  obstacles,
  startPoint,
  stairsOn
} from '../editor/scene3d/walk';
import {
  STEP,
  SNAP_TURN,
  createWalk,
  facing,
  type Walk,
  type WalkPose
} from '../editor/scene3d/walkControls';
import { getItemHeights } from '../res/catalog';
import { getItemModel } from '../res/catalog/models';
import { WalkJoystick } from './WalkJoystick';

interface Props {
  opened: boolean;
  onClose: () => void;
}

/** Walls are cut off this far above each floor in the cut-away view. */
const CUTAWAY = 1.2 * METER;
const TURN = Math.PI / 6;
const ORBIT_FOV = 40;
const WALK_FOV = 70;

type Mode = 'orbit' | 'walk';

interface Stage {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  controls: OrbitControls;
  /** the building now shown; teleport clicks are tested against it */
  building: Object3D | null;
  /** set while walking: moves the camera each frame instead of the orbit */
  tick: ((seconds: number) => void) | null;
}

// Read-only 3D view of the plan: orbit, zoom and pan, one floor or all of
// them, walls whole or cut away, and a PNG of what is on screen. three.js is
// only loaded when this dialog opens (ToolNavbar imports it lazily).
export function ThreeDView({ opened, onClose }: Props) {
  const [allFloors, setAllFloors] = useState(false);
  const [cutaway, setCutaway] = useState(true);
  const [mode, setMode] = useState<Mode>('orbit');
  const [reduceMotion] = useState(
    () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );
  const [coarse] = useState(
    () => !!window.matchMedia?.('(pointer: coarse)').matches
  );
  const [teleport, setTeleport] = useState(reduceMotion);
  const narrow = useMediaQuery('(max-width: 48em)');
  const walk = useRef<Walk | null>(null);
  // Where the walker should stand when its floor changes; null starts afresh.
  const arriveAt = useRef<Point | null>(null);
  // The walker's spot changes every frame, so it lives in a ref; the view
  // only re-renders when what it shows about it changes.
  const walkerAt = useRef<Point | null>(null);
  const [pose, setPose] = useState<{
    facing: string;
    atStairs: boolean;
    canClimb: boolean;
  } | null>(null);
  const [noWebGl] = useState(() => !webGlAvailable());
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const stage = useRef<Stage | null>(null);

  // The plan cannot change while the dialog is open, so read it once.
  const inst = useInstance();
  const [plan] = useState(
    () => JSON.parse(inst.serializer.serialize()) as FloorPlanSerializable
  );
  const [current] = useState(() => inst.plan.getState().currentFloor);
  const [walkFloor, setWalkFloor] = useState(current);
  const walking = mode === 'walk';
  const model = useMemo(
    () =>
      sceneModel(
        plan,
        walking
          ? // One floor, walls whole and a ceiling overhead.
            { allFloors: false, current: walkFloor, cutaway: null }
          : { allFloors, current, cutaway: cutaway ? CUTAWAY : null },
        getItemHeights,
        getItemModel
      ),
    [plan, walking, walkFloor, allFloors, current, cutaway]
  );
  // What the walker bumps into and stands on for the floor being walked.
  const walkWorld = useMemo(() => {
    const floor = plan.floors[walkFloor];
    if (!floor) return null;
    const input = floorInput(floor, walkFloor);
    const geometry = floorGeometry(input);
    return {
      elevation: input.elevation,
      geometry,
      blocks: obstacles(geometry.walls, input.elevation),
      stairs: stairsOn(floor)
    };
  }, [plan, walkFloor]);
  const walkWorldRef = useRef(walkWorld);
  useEffect(() => {
    walkWorldRef.current = walkWorld;
  }, [walkWorld]);
  // A floor with no walls has nothing to walk in, so it is skipped.
  const walkable = (i: number) =>
    (plan.floors[i]?.wallNodeLinks.length ?? 0) > 0;
  const canClimb = !!pose?.canClimb;
  const floorAbove = walkable(walkFloor + 1);
  const floorBelow = walkable(walkFloor - 1);
  const goToFloor = (direction: 1 | -1) => {
    const target = walkFloor + direction;
    const from = walkerAt.current;
    if (!from || !canClimb || !walkable(target)) return;
    const floor = plan.floors[target];
    const input = floorInput(floor, target);
    const geometry = floorGeometry(input);
    arriveAt.current = arrival(
      from,
      stairsOn(floor),
      geometry,
      obstacles(geometry.walls, input.elevation)
    );
    setWalkFloor(target);
  };
  // The walker's Page Up / Page Down go through a ref, so they always see
  // the floor and pose of the latest render.
  const changeFloor = useRef(goToFloor);
  useEffect(() => {
    changeFloor.current = goToFloor;
  });

  const empty =
    model.wallCount === 0 &&
    model.furnitureCount === 0 &&
    model.hiddenCount === 0;
  // The camera frames the whole-height building, so switching the cut-away
  // off does not push the walls out of view.
  const frameBounds = useMemo(
    () =>
      sceneModel(
        plan,
        { allFloors, current, cutaway: null },
        getItemHeights,
        getItemModel
      ).bounds,
    [plan, allFloors, current]
  );

  // Renderer, camera and controls live as long as the dialog.
  useEffect(() => {
    if (!host || empty || noWebGl) return;
    const renderer = new WebGLRenderer({
      antialias: true,
      // Keeps the last frame readable for the PNG export.
      preserveDrawingBuffer: true
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.domElement.tabIndex = 0;
    renderer.domElement.setAttribute('role', 'img');
    host.appendChild(renderer.domElement);

    const scene = new Scene();
    scene.background = new Color('#fafaf8');
    scene.add(new HemisphereLight('#ffffff', '#8d8a85', 2.2));
    const sun = new DirectionalLight('#ffffff', 1.4);
    scene.add(sun);
    const camera = new PerspectiveCamera(ORBIT_FOV, 1, 10, 1e6);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !reduceMotion;
    // Arrow keys pan when the view has focus.
    controls.listenToKeyEvents(renderer.domElement);
    controls.keyPanSpeed = 20;
    // Stay above the ground.
    controls.maxPolarAngle = Math.PI * 0.49;
    stage.current = {
      renderer,
      scene,
      camera,
      controls,
      building: null,
      tick: null
    };
    const s = stage.current;

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = host;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    let frame = 0;
    let last = performance.now();
    const loop = () => {
      const now = performance.now();
      if (s.tick) s.tick((now - last) / 1000);
      else controls.update();
      last = now;
      sun.position.copy(camera.position).add(new Vector3(0, 500, 0));
      renderer.render(scene, camera);
      frame = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      stage.current = null;
    };
    // `empty` flips only between no plan and some plan; the stage is rebuilt then.
  }, [host, empty, noWebGl, reduceMotion]);

  // Rebuild the building when the options change, keeping the camera.
  useEffect(() => {
    const s = stage.current;
    if (!s) return;
    const built = buildGroup(model.prisms);
    s.scene.add(built.group);
    s.building = built.group;
    return () => {
      s.scene.remove(built.group);
      s.building = null;
      built.dispose();
    };
  }, [model, host, empty]);

  // Frame the building when the view opens and when what is shown changes
  // size (one floor or all), not when the cut-away is toggled.
  useEffect(() => {
    if (stage.current && !walking) frame(stage.current, frameBounds);
  }, [frameBounds, host, empty, walking]);

  // Walking: the orbit controls step aside and the walker drives the camera.
  useEffect(() => {
    const s = stage.current;
    if (!s || !walking) return;
    s.controls.enabled = false;
    s.camera.fov = WALK_FOV;
    s.camera.near = 5;
    s.camera.far = 1e5;
    s.camera.updateProjectionMatrix();
    const w = createWalk({
      camera: s.camera,
      canvas: s.renderer.domElement,
      targets: () => (s.building ? [s.building] : []),
      onMove: (p: WalkPose) => {
        walkerAt.current = p.pos;
        const world = walkWorldRef.current;
        const next = {
          facing: facing(p.yaw),
          atStairs: !!world && atStairs(p.pos, world.stairs),
          canClimb: !!world && canChangeFloor(p.pos, world.stairs)
        };
        setPose((old) =>
          old &&
          old.facing === next.facing &&
          old.atStairs === next.atStairs &&
          old.canClimb === next.canClimb
            ? old
            : next
        );
      },
      onFloorKey: (direction) => changeFloor.current(direction)
    });
    walk.current = w;
    s.tick = w.tick;
    s.renderer.domElement.focus();
    return () => {
      w.dispose();
      walk.current = null;
      s.tick = null;
      s.controls.enabled = true;
      s.camera.fov = ORBIT_FOV;
      s.camera.updateProjectionMatrix();
      walkerAt.current = null;
      setPose(null);
    };
  }, [walking, host, empty]);

  // Put the walker on its floor, on entering walk mode and after the stairs.
  useEffect(() => {
    const w = walk.current;
    if (!w || !walkWorld) return;
    const at =
      arriveAt.current ?? startPoint(walkWorld.geometry, walkWorld.blocks);
    arriveAt.current = null;
    w.place(walkWorld.blocks, walkWorld.elevation, at);
  }, [walkWorld, walking, host, empty]);

  useEffect(() => {
    walk.current?.setTeleport(teleport);
  }, [teleport, walking, host, empty]);

  const turn = (angle: number) => {
    if (walk.current) {
      walk.current.turn(angle);
      return;
    }
    const s = stage.current;
    if (!s) return;
    const offset = s.camera.position.clone().sub(s.controls.target);
    const spherical = new Spherical().setFromVector3(offset);
    spherical.theta += angle;
    s.camera.position
      .copy(s.controls.target)
      .add(new Vector3().setFromSpherical(spherical));
  };
  const zoom = (factor: number) => {
    const s = stage.current;
    if (!s) return;
    const offset = s.camera.position.clone().sub(s.controls.target);
    s.camera.position
      .copy(s.controls.target)
      .add(offset.multiplyScalar(factor));
  };
  const resetView = () => {
    if (walk.current && walkWorld) {
      walk.current.place(
        walkWorld.blocks,
        walkWorld.elevation,
        startPoint(walkWorld.geometry, walkWorld.blocks),
        0
      );
      return;
    }
    if (stage.current) frame(stage.current, frameBounds);
  };
  const savePng = () => {
    const s = stage.current;
    if (!s) return;
    s.renderer.render(s.scene, s.camera);
    s.renderer.domElement.toBlob((blob) => {
      if (blob) saveAs(blob, `axonometra-3d-${timestamp()}.png`);
    }, 'image/png');
  };
  // The whole building, every floor and walls whole, whatever is on screen.
  const saveModel = async () => {
    const data = await exportGlb(JSON.stringify(plan));
    saveAs(
      new Blob([data], { type: 'model/gltf-binary' }),
      `axonometra-3d-${timestamp()}.glb`
    );
  };

  const where = pose
    ? `Floor ${walkFloor}, facing ${pose.facing}${
        pose.atStairs ? ', at the stairs' : ''
      }.`
    : '';
  const label = walking
    ? `3D walk-through of floor ${walkFloor}: ${wallsAndFurniture(model.wallCount, model.furnitureCount)}.`
    : `3D view of ${
        allFloors ? `all ${plan.floors.length} floors` : `floor ${current}`
      }: ${wallsAndFurniture(model.wallCount, model.furnitureCount)}${
        model.hiddenCount ? ` (${model.hiddenCount} more above the cut)` : ''
      }${cutaway ? ', walls cut away' : ''}.`;
  useEffect(() => {
    stage.current?.renderer.domElement.setAttribute('aria-label', label);
  }, [label, host, empty]);

  return (
    <AppDialog open={opened} onClose={onClose} fullScreen title="3D view">
      <Stack
        direction="row"
        sx={{
          flex: 'none',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2
        }}
      >
        <Stack
          direction="row"
          sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}
        >
          <ToggleButtonGroup
            aria-label="View mode"
            size="small"
            exclusive
            value={mode}
            disabled={empty || noWebGl}
            onChange={(_e, v: Mode | null) => {
              if (v === null) return;
              // Start on the floor in view, or the first with walls.
              if (v === 'walk')
                setWalkFloor(
                  walkable(current)
                    ? current
                    : Math.max(
                        0,
                        plan.floors.findIndex((_, i) => walkable(i))
                      )
                );
              setMode(v);
            }}
          >
            <ToggleButton value="orbit">Orbit</ToggleButton>
            <ToggleButton value="walk">Walk</ToggleButton>
          </ToggleButtonGroup>
          {walking ? (
            <>
              <ViewButton name="Turn left" onClick={() => turn(SNAP_TURN)}>
                <IconRotate2 />
              </ViewButton>
              <ViewButton name="Turn right" onClick={() => turn(-SNAP_TURN)}>
                <IconRotateClockwise2 />
              </ViewButton>
              <ViewButton
                name="Step forward"
                onClick={() => walk.current?.step(STEP)}
              >
                <IconArrowUp />
              </ViewButton>
              {plan.floors.length > 1 && (
                <>
                  <ViewButton
                    name="Go up a floor"
                    onClick={() => goToFloor(1)}
                    disabled={!canClimb || !floorAbove}
                  >
                    <IconStairsUp />
                  </ViewButton>
                  <ViewButton
                    name="Go down a floor"
                    onClick={() => goToFloor(-1)}
                    disabled={!canClimb || !floorBelow}
                  >
                    <IconStairsDown />
                  </ViewButton>
                </>
              )}
            </>
          ) : (
            <>
              <ViewButton name="Turn left" onClick={() => turn(-TURN)}>
                <IconRotate2 />
              </ViewButton>
              <ViewButton name="Turn right" onClick={() => turn(TURN)}>
                <IconRotateClockwise2 />
              </ViewButton>
              <ViewButton name="Zoom in" onClick={() => zoom(0.8)}>
                <IconZoomIn />
              </ViewButton>
              <ViewButton name="Zoom out" onClick={() => zoom(1.25)}>
                <IconZoomOut />
              </ViewButton>
            </>
          )}
          <ViewButton name="Reset view" onClick={resetView}>
            <IconFocusCentered />
          </ViewButton>
        </Stack>
        <Stack
          direction="row"
          sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}
        >
          {walking ? (
            <LabelledSwitch
              label="Teleport"
              checked={teleport}
              onChange={setTeleport}
            />
          ) : (
            <LabelledSwitch
              label="Cut away walls"
              checked={cutaway}
              onChange={setCutaway}
            />
          )}
          {!walking && plan.floors.length > 1 && (
            <LabelledSwitch
              label="All floors"
              checked={allFloors}
              onChange={setAllFloors}
            />
          )}
          {narrow ? (
            // Icons on a phone, so the toolbar leaves room for the view.
            <Stack direction="row" spacing={1}>
              <ViewButton
                name="Save image"
                onClick={savePng}
                disabled={empty || noWebGl}
              >
                <IconPhotoDown />
              </ViewButton>
              <ViewButton
                name="Save 3D model"
                onClick={() => void saveModel()}
                disabled={empty}
              >
                <IconFileDownload />
              </ViewButton>
            </Stack>
          ) : (
            <>
              <Button
                variant="outlined"
                startIcon={<IconDownload size={18} />}
                onClick={savePng}
                disabled={empty || noWebGl}
              >
                Save image
              </Button>
              <Button
                variant="outlined"
                startIcon={<IconDownload size={18} />}
                onClick={() => void saveModel()}
                disabled={empty}
              >
                Save 3D model
              </Button>
            </>
          )}
        </Stack>
      </Stack>
      {empty ? (
        <Typography
          sx={{ mt: '20vh', color: 'text.secondary', textAlign: 'center' }}
        >
          Draw some walls on this floor to see them here.
        </Typography>
      ) : noWebGl ? (
        <Typography
          sx={{ mt: '20vh', color: 'text.secondary', textAlign: 'center' }}
        >
          The 3D view needs WebGL, which this browser does not provide.
        </Typography>
      ) : (
        <>
          <Box
            ref={setHost}
            sx={{
              flex: 1,
              minHeight: 0,
              position: 'relative',
              // three.js's own canvas.
              '& > canvas': {
                display: 'block',
                width: '100%',
                height: '100%',
                '&:focus-visible': {
                  outline: '2px solid',
                  outlineColor: 'primary.main',
                  outlineOffset: 2
                }
              }
            }}
          >
            {walking && coarse && !teleport && (
              <WalkJoystick onChange={(x, y) => walk.current?.setStick(x, y)} />
            )}
          </Box>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {!walking
              ? 'Drag to turn, right-drag or arrow keys to move, scroll to zoom.'
              : teleport
                ? coarse
                  ? 'Drag to look, tap the floor to go there.'
                  : 'Drag to look, click the floor to go there, arrow keys to step, Q and E to turn.'
                : coarse
                  ? 'Drag to look, use the stick to walk.'
                  : 'Drag to look, W A S D or arrow keys to walk, Q and E to turn.'}
            {walking &&
              plan.floors.length > 1 &&
              (coarse
                ? ' Use the stair buttons at the stairs to change floor.'
                : ' Page Up and Page Down change floor at the stairs.')}
          </Typography>
          {walking && (
            <Typography variant="body2" aria-live="polite">
              {where}
            </Typography>
          )}
        </>
      )}
    </AppDialog>
  );
}

function ViewButton({
  name,
  onClick,
  disabled,
  children
}: {
  name: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <Tooltip title={name}>
      {/* A disabled button fires no events, so the tooltip needs a wrapper. */}
      <span>
        <IconButton aria-label={name} onClick={onClick} disabled={disabled}>
          {children}
        </IconButton>
      </span>
    </Tooltip>
  );
}

function LabelledSwitch({
  label,
  checked,
  onChange
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <FormControlLabel
      label={label}
      control={
        <Switch
          checked={checked}
          onChange={(e) => onChange(e.currentTarget.checked)}
        />
      }
    />
  );
}

function webGlAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

// Look at the whole building from the front right, a little above it.
function frame(s: Stage, bounds: { min: number[]; max: number[] }) {
  const [x0, y0, z0] = bounds.min;
  const [x1, y1, z1] = bounds.max;
  // Plan (x, y, height) → three (x, height, y).
  const centre = new Vector3((x0 + x1) / 2, (z0 + z1) / 2, (y0 + y1) / 2);
  const radius = Math.max(Math.hypot(x1 - x0, y1 - y0, z1 - z0) / 2, 2 * METER);
  const distance = radius / Math.sin((s.camera.fov * Math.PI) / 360);
  s.controls.target.copy(centre);
  s.camera.position
    .copy(centre)
    .add(new Vector3(0.55, 0.65, 0.75).normalize().multiplyScalar(distance));
  s.camera.near = distance / 100;
  s.camera.far = distance * 20;
  s.camera.updateProjectionMatrix();
  // Settle the controls at once: with damping on, leftover motion from a
  // drag or turn would otherwise carry on past the reset.
  const damping = s.controls.enableDamping;
  s.controls.enableDamping = false;
  s.controls.update();
  s.controls.enableDamping = damping;
}
