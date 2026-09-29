// First-person controls for the 3D view's walk-through. Drives a three.js
// camera from keys, a pointer drag, an on-screen joystick and, in teleport
// mode, clicks on the floor; the collision itself is walk.ts. Plan units are
// kept: plan (x, y) is three (x, z), and height is three's y.
import { Object3D, PerspectiveCamera, Raycaster, Vector2 } from 'three';
import { METER } from '../editor/constants';
import type { Point } from './geometry';
import { EYE_HEIGHT, type Obstacle, canStand, move } from './walk';

const WALK_SPEED = 1.4 * METER; // per second
const TURN_SPEED = 1.8; // radians per second
const LOOK_SPEED = 0.005; // radians per pixel dragged
const MAX_PITCH = 1.4;
/** A teleport step, and a snap turn, for keys in teleport mode. */
export const STEP = 1 * METER;
export const SNAP_TURN = Math.PI / 6;
/** A press that moves less than this many pixels is a click, not a drag. */
const CLICK_SLOP = 5;

export interface WalkPose {
  pos: Point;
  /** radians; 0 faces up the plan (north), positive turns left */
  yaw: number;
}

export interface WalkOptions {
  camera: PerspectiveCamera;
  canvas: HTMLCanvasElement;
  /** what a teleport click may land on: meshes named 'floor' */
  targets: () => Object3D[];
  onMove: (pose: WalkPose) => void;
  /** Page Up (+1) or Page Down (-1) */
  onFloorKey: (direction: 1 | -1) => void;
}

export interface Walk {
  /** put the walker on a floor: its obstacles, height and where to stand */
  place: (blocks: Obstacle[], elevation: number, pos: Point) => void;
  tick: (seconds: number) => void;
  turn: (angle: number) => void;
  /** move `distance` forward (negative: back), sliding along walls */
  step: (distance: number, sideways?: number) => void;
  setTeleport: (on: boolean) => void;
  /** joystick vector, x right and y forward, each -1 to 1 */
  setStick: (x: number, y: number) => void;
  dispose: () => void;
}

const MOVE_KEYS: Record<string, [number, number]> = {
  KeyW: [1, 0],
  ArrowUp: [1, 0],
  KeyS: [-1, 0],
  ArrowDown: [-1, 0],
  KeyA: [0, -1],
  KeyD: [0, 1]
};
const TURN_KEYS: Record<string, number> = {
  ArrowLeft: 1,
  KeyQ: 1,
  ArrowRight: -1,
  KeyE: -1
};

export function createWalk(options: WalkOptions): Walk {
  const { camera, canvas } = options;
  let blocks: Obstacle[] = [];
  let elevation = 0;
  let pos: Point = { x: 0, y: 0 };
  let yaw = 0;
  let pitch = 0;
  let teleport = false;
  let stick = { x: 0, y: 0 };
  const held = new Set<string>();

  const apply = () => {
    camera.position.set(pos.x, elevation + EYE_HEIGHT, pos.y);
    camera.rotation.set(pitch, yaw, 0, 'YXZ');
    options.onMove({ pos, yaw });
  };
  // Forward and right, in plan coordinates.
  const forward = () => ({ x: -Math.sin(yaw), y: -Math.cos(yaw) });
  const right = () => ({ x: Math.cos(yaw), y: -Math.sin(yaw) });
  const walk = (ahead: number, side: number) => {
    const f = forward();
    const r = right();
    pos = move(
      pos,
      { x: f.x * ahead + r.x * side, y: f.y * ahead + r.y * side },
      blocks
    );
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'PageUp' || e.code === 'PageDown') {
      e.preventDefault();
      options.onFloorKey(e.code === 'PageUp' ? 1 : -1);
      return;
    }
    const known = e.code in MOVE_KEYS || e.code in TURN_KEYS;
    if (!known || e.altKey || e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    if (!teleport) {
      held.add(e.code);
      return;
    }
    // Teleport mode: each press is one instant step or turn, no motion.
    if (e.code in TURN_KEYS) {
      yaw += TURN_KEYS[e.code] * SNAP_TURN;
    } else {
      const [ahead, side] = MOVE_KEYS[e.code];
      walk(ahead * STEP, side * STEP);
    }
    apply();
  };
  const onKeyUp = (e: KeyboardEvent) => held.delete(e.code);
  const onBlur = () => held.clear();

  // Drag to look, with any pointer; a click without a drag teleports.
  let drag: { id: number; x: number; y: number; moved: number } | null = null;
  const onPointerDown = (e: PointerEvent) => {
    if (drag) return;
    canvas.focus();
    canvas.setPointerCapture(e.pointerId);
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: 0 };
  };
  const onPointerMove = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    drag.x = e.clientX;
    drag.y = e.clientY;
    drag.moved += Math.abs(dx) + Math.abs(dy);
    yaw -= dx * LOOK_SPEED;
    pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, pitch - dy * LOOK_SPEED));
    apply();
  };
  const onPointerUp = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return;
    const click = drag.moved < CLICK_SLOP;
    drag = null;
    if (click && teleport) teleportTo(e);
  };

  const raycaster = new Raycaster();
  const teleportTo = (e: PointerEvent) => {
    const box = canvas.getBoundingClientRect();
    const ndc = new Vector2(
      ((e.clientX - box.left) / box.width) * 2 - 1,
      -((e.clientY - box.top) / box.height) * 2 + 1
    );
    raycaster.setFromCamera(ndc, camera);
    const [hit] = raycaster.intersectObjects(options.targets(), true);
    // Only the floor itself: a click on a wall must not go through it.
    if (!hit || hit.object.name !== 'floor') return;
    const target = { x: hit.point.x, y: hit.point.z };
    if (!canStand(target, blocks)) return;
    pos = target;
    apply();
  };

  canvas.addEventListener('keydown', onKeyDown);
  canvas.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('blur', onBlur);
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);

  return {
    place(nextBlocks, nextElevation, at) {
      blocks = nextBlocks;
      elevation = nextElevation;
      pos = at;
      apply();
    },
    tick(seconds) {
      if (teleport) return;
      let ahead = stick.y;
      let side = stick.x;
      let turning = 0;
      for (const code of held) {
        if (code in MOVE_KEYS) {
          ahead += MOVE_KEYS[code][0];
          side += MOVE_KEYS[code][1];
        } else if (code in TURN_KEYS) {
          turning += TURN_KEYS[code];
        }
      }
      if (!ahead && !side && !turning) return;
      const length = Math.hypot(ahead, side);
      // Diagonals are no faster than straight lines.
      const scale = length > 1 ? 1 / length : 1;
      const d = WALK_SPEED * Math.min(seconds, 0.1);
      yaw += turning * TURN_SPEED * Math.min(seconds, 0.1);
      walk(ahead * scale * d, side * scale * d);
      apply();
    },
    turn(angle) {
      yaw += angle;
      apply();
    },
    step(distance, sideways = 0) {
      walk(distance, sideways);
      apply();
    },
    setTeleport(on) {
      teleport = on;
      held.clear();
    },
    setStick(x, y) {
      stick = { x, y };
    },
    dispose() {
      canvas.removeEventListener('keydown', onKeyDown);
      canvas.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('blur', onBlur);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
    }
  };
}

/** Compass point the walker faces, from its yaw. */
export function facing(yaw: number): string {
  const names = [
    'north',
    'north-east',
    'east',
    'south-east',
    'south',
    'south-west',
    'west',
    'north-west'
  ];
  // Positive yaw turns left (west); headings run clockwise from north.
  const heading = ((((-yaw * 180) / Math.PI) % 360) + 360) % 360;
  return names[Math.round(heading / 45) % 8];
}
