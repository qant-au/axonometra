// Axonometra: the plans the first-run wizard starts a building and a caravan from. Each is the outline at the size
// given, one room to a level, for the editor to divide and fit out: the wizard asks only what a plan cannot start
// without. Metres, x to the right, z down the plan, as everywhere in the plan.

import { emptyBuilding, newFloor, type Building, type Floor, type Vec2 } from "../model.ts";

const positive = (v: number) => Number.isFinite(v) && v > 0;
const rect = (x0: number, z0: number, x1: number, z1: number): Vec2[] => [
  [x0, z0],
  [x1, z0],
  [x1, z1],
  [x0, z1],
];

function level(id: string, name: string, elevation: number, height: number, rooms: [string, Vec2[]][]): Floor {
  const floor = newFloor(`floor_${id}`, name, elevation);
  floor.height = height;
  floor.rooms = rooms.map(([room, points], i) => ({ id: `room_${id}_${i + 1}`, name: room, area_id: null, points, floor_material: "wood" }));
  return floor;
}

export interface HouseBasics {
  /** Across the front (m). */
  width: number;
  /** Front to back (m). */
  depth: number;
  /** Levels from the ground up. */
  levels: number;
  basement: boolean;
}

export const HOUSE_DEFAULTS: HouseBasics = { width: 12, depth: 10, levels: 1, basement: false };

/** From one floor to the next, and the room height in it (m). */
const STOREY = 3;
const ROOM_HEIGHT = 2.7;
const LEVELS = ["Ground Floor", "First Floor", "Second Floor", "Third Floor", "Fourth Floor", "Fifth Floor", "Sixth Floor", "Seventh Floor", "Eighth Floor", "Ninth Floor"];
export const MAX_LEVELS = LEVELS.length;

export function houseProblems(b: HouseBasics): (keyof HouseBasics)[] {
  const out: (keyof HouseBasics)[] = [];
  if (!positive(b.width)) out.push("width");
  if (!positive(b.depth)) out.push("depth");
  if (!Number.isInteger(b.levels) || b.levels < 1 || b.levels > MAX_LEVELS) out.push("levels");
  return out;
}

/** A building of this size: every level one room over the whole footprint, the basement below the ground floor. */
export function housePlan(b: HouseBasics): Building {
  const plan = emptyBuilding();
  const outline = rect(0, 0, b.width, b.depth);
  plan.floors = [
    ...(b.basement ? [level("basement", "Basement", -STOREY, ROOM_HEIGHT, [["Basement", outline]])] : []),
    ...LEVELS.slice(0, b.levels).map((name, i) => level(String(i), name, i * STOREY, ROOM_HEIGHT, [[name, outline]])),
  ];
  return plan;
}

/** Towed behind a vehicle (a caravan, a fifth wheeler, a race trailer), or driven itself (a bus, a motorhome). */
export type CaravanType = "towed" | "rigid";

export interface CaravanBasics {
  type: CaravanType;
  /** The body's length and width (m). */
  length: number;
  width: number;
}

/** The size each type starts at. */
export const CARAVAN_SIZES: Record<CaravanType, { length: number; width: number }> = {
  towed: { length: 6.5, width: 2.4 },
  rigid: { length: 8, width: 2.4 },
};

/** A rigid mobile home's cab, at the front of the body (m), and the room height inside (m). */
const CAB = 1.8;
const BODY_HEIGHT = 2;

export function caravanProblems(b: CaravanBasics): (keyof CaravanBasics)[] {
  const out: (keyof CaravanBasics)[] = [];
  // a rigid one needs room behind its cab
  if (!positive(b.length) || (b.type === "rigid" && b.length <= CAB + 1)) out.push("length");
  if (!positive(b.width)) out.push("width");
  return out;
}

/** A caravan or mobile home of this size: the body as one level with thin walls, a rigid one with its cab at the front. */
export function caravanPlan(b: CaravanBasics): Building {
  const plan = emptyBuilding();
  plan.settings = { ...plan.settings, wall_exterior: 0.05, wall_interior: 0.03 };
  plan.floors = [
    b.type === "rigid"
      ? level("body", "Mobile Home", 0, BODY_HEIGHT, [
          ["Cab", rect(0, 0, CAB, b.width)],
          ["Living Area", rect(CAB, 0, b.length, b.width)],
        ])
      : level("body", "Caravan", 0, BODY_HEIGHT, [["Living Area", rect(0, 0, b.length, b.width)]]),
  ];
  return plan;
}
