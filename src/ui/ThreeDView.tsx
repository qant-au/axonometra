import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActionIcon,
  Button,
  Group,
  Modal,
  Switch,
  Text,
  Tooltip
} from '@mantine/core';
import {
  IconDownload,
  IconFocusCentered,
  IconRotate2,
  IconRotateClockwise2,
  IconZoomIn,
  IconZoomOut
} from '@tabler/icons-react';
import {
  Color,
  DirectionalLight,
  HemisphereLight,
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
import type { FloorPlanSerializable } from '../editor/editor/persistence/FloorPlanSerializable';
import { serializer } from '../editor/editor/persistence/Serializer';
import { sceneModel } from '../editor/scene3d/sceneModel';
import { buildGroup } from '../editor/scene3d/threeScene';
import { getItemHeights } from '../res/catalog';
import { getItemModel } from '../res/catalog/models';
import { useFloorPlanStore } from '../stores/FloorPlanStore';
import classes from './ThreeDView.module.css';

interface Props {
  opened: boolean;
  onClose: () => void;
}

/** Walls are cut off this far above each floor in the cut-away view. */
const CUTAWAY = 1.2 * METER;
const TURN = Math.PI / 6;

interface Stage {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  controls: OrbitControls;
}

// Read-only 3D view of the plan: orbit, zoom and pan, one floor or all of
// them, walls whole or cut away, and a PNG of what is on screen. three.js is
// only loaded when this dialog opens (ToolNavbar imports it lazily).
export function ThreeDView({ opened, onClose }: Props) {
  const [allFloors, setAllFloors] = useState(false);
  const [cutaway, setCutaway] = useState(true);
  const [noWebGl] = useState(() => !webGlAvailable());
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const stage = useRef<Stage | null>(null);

  // The plan cannot change while the dialog is open, so read it once.
  const [plan] = useState(
    () => JSON.parse(serializer.serialize()) as FloorPlanSerializable
  );
  const [current] = useState(() => useFloorPlanStore.getState().currentFloor);
  const model = useMemo(
    () =>
      sceneModel(
        plan,
        { allFloors, current, cutaway: cutaway ? CUTAWAY : null },
        getItemHeights,
        getItemModel
      ),
    [plan, allFloors, current, cutaway]
  );
  const empty = model.wallCount === 0 && model.furnitureCount === 0;
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
    renderer.domElement.className = classes.canvas;
    renderer.domElement.tabIndex = 0;
    renderer.domElement.setAttribute('role', 'img');
    host.appendChild(renderer.domElement);

    const scene = new Scene();
    scene.background = new Color('#fafaf8');
    scene.add(new HemisphereLight('#ffffff', '#8d8a85', 2.2));
    const sun = new DirectionalLight('#ffffff', 1.4);
    scene.add(sun);
    const camera = new PerspectiveCamera(40, 1, 10, 1e6);
    const controls = new OrbitControls(camera, renderer.domElement);
    const reduceMotion = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    controls.enableDamping = !reduceMotion;
    // Arrow keys pan when the view has focus.
    controls.listenToKeyEvents(renderer.domElement);
    controls.keyPanSpeed = 20;
    // Stay above the ground.
    controls.maxPolarAngle = Math.PI * 0.49;
    stage.current = { renderer, scene, camera, controls };

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
    const loop = () => {
      controls.update();
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
  }, [host, empty, noWebGl]);

  // Rebuild the building when the options change, keeping the camera.
  useEffect(() => {
    const s = stage.current;
    if (!s) return;
    const built = buildGroup(model.prisms);
    s.scene.add(built.group);
    return () => {
      s.scene.remove(built.group);
      built.dispose();
    };
  }, [model, host, empty]);

  // Frame the building when the view opens and when what is shown changes
  // size (one floor or all), not when the cut-away is toggled.
  useEffect(() => {
    if (stage.current) frame(stage.current, frameBounds);
  }, [frameBounds, host, empty]);

  const turn = (angle: number) => {
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

  const label = `3D view of ${
    allFloors ? `all ${plan.floors.length} floors` : `floor ${current}`
  }: ${model.wallCount} walls and ${model.furnitureCount} pieces of furniture${
    cutaway ? ', walls cut away' : ''
  }.`;
  useEffect(() => {
    stage.current?.renderer.domElement.setAttribute('aria-label', label);
  }, [label, host, empty]);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      fullScreen
      title="3D view"
      classNames={{ body: classes.body }}
    >
      <Group justify="space-between" className={classes.controls}>
        <Group gap="xs">
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
          <ViewButton name="Reset view" onClick={resetView}>
            <IconFocusCentered />
          </ViewButton>
        </Group>
        <Group gap="md">
          <Switch
            label="Cut away walls"
            checked={cutaway}
            onChange={(e) => setCutaway(e.currentTarget.checked)}
          />
          {plan.floors.length > 1 && (
            <Switch
              label="All floors"
              checked={allFloors}
              onChange={(e) => setAllFloors(e.currentTarget.checked)}
            />
          )}
          <Button
            variant="default"
            leftSection={<IconDownload size={18} />}
            onClick={savePng}
            disabled={empty || noWebGl}
          >
            Save image
          </Button>
        </Group>
      </Group>
      {empty ? (
        <Text c="dimmed" ta="center" className={classes.message}>
          Draw some walls on this floor to see them here.
        </Text>
      ) : noWebGl ? (
        <Text c="dimmed" ta="center" className={classes.message}>
          The 3D view needs WebGL, which this browser does not provide.
        </Text>
      ) : (
        <>
          <div ref={setHost} className={classes.stage} />
          <Text size="sm" c="dimmed">
            Drag to turn, right-drag or arrow keys to move, scroll to zoom.
          </Text>
        </>
      )}
    </Modal>
  );
}

function ViewButton({
  name,
  onClick,
  children
}: {
  name: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip label={name}>
      <ActionIcon
        variant="default"
        size="lg"
        aria-label={name}
        onClick={onClick}
      >
        {children}
      </ActionIcon>
    </Tooltip>
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
  s.controls.update();
}
