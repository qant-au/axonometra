// Axonometra: example plans, a starting set of buildings and rooms for demos and for later work to build on. Each one is
// an original layout of a common type (nothing traced from a published plan), written as rooms on a metre grid with
// their doors, windows and stairs, and turned into a plan by the importer's common end (import/builder.ts), the same
// way an imported plan is. Not furnished: the structure only.
//
// Coordinates as everywhere in the plan: metres, x to the right, z down the plan; room outlines run along the middle
// of the walls, so neighbours share their edge. The street front is at the bottom of the plan (largest z).

import type { Building, BuildingSettings, OpeningStyle, RoofSettings, Vec2 } from "../model.ts";
import { buildPlan, type RawFloor, type RawOpening, type Warning } from "../import/builder.ts";
import { pointOnRoomEdge } from "../geometry/walls.ts";
import { PLATE_FISHING_6_5 } from "../hull/plate.ts";
import { SHAFT } from "../hull/open.ts";
import { vesselBuilding } from "../vessel/plan.ts";
import type { VesselSpec } from "../vessel/spec.ts";

export interface ExampleRoom {
  name: string;
  points: Vec2[];
  /** Floor finish (FLOOR_MATERIALS); the importer's default is wood. */
  material?: string;
}

export interface ExampleOpening {
  kind: "door" | "window" | "garage";
  /** The opening's middle, on a room edge. */
  at: Vec2;
  width: number;
  height: number;
  sill: number;
  /** A look other than the automatic one (a sliding door, a glass wall). */
  style?: OpeningStyle;
}

export interface ExampleStairs {
  /** The stair's middle; it rises towards `rises` and reaches the next floor up. */
  at: Vec2;
  width: number;
  length: number;
  rise: number;
  rises: "-z" | "+z" | "-x" | "+x";
}

export interface ExampleFloor {
  name: string;
  elevation: number;
  height: number;
  rooms: ExampleRoom[];
  openings: ExampleOpening[];
  stairs?: ExampleStairs[];
}

export interface ExamplePlan {
  title: string;
  /** One line on what it is. */
  note: string;
  /** A whole building, or a fit-out of rooms inside one (no roof, no outside). */
  kind: "building" | "rooms";
  floors: ExampleFloor[];
  settings?: Partial<Pick<BuildingSettings, "wall_exterior" | "wall_interior" | "units">> & { roof?: RoofSettings };
}

const rect = (x0: number, z0: number, x1: number, z1: number): Vec2[] => [
  [x0, z0],
  [x1, z0],
  [x1, z1],
  [x0, z1],
];
const room = (name: string, points: Vec2[], material?: string): ExampleRoom => ({ name, points, ...(material ? { material } : {}) });
const door = (x: number, z: number, width = 0.82, style?: OpeningStyle): ExampleOpening => ({ kind: "door", at: [x, z], width, height: 2.04, sill: 0, ...(style ? { style } : {}) });
const window_ = (x: number, z: number, width: number, sill = 0.9, height = 1.3): ExampleOpening => ({ kind: "window", at: [x, z], width, height, sill });
const garage = (x: number, z: number, width: number, height = 2.1): ExampleOpening => ({ kind: "garage", at: [x, z], width, height, sill: 0 });
/** A door to the garden or a balcony: glass, sliding. */
const slider = (x: number, z: number, width = 2.1): ExampleOpening => ({ kind: "door", at: [x, z], width, height: 2.1, sill: 0, style: "sliding" });

/**
 * A two-storey family home (12 x 16 m, about 380 m² over both floors): the double garage, a guest room and the living
 * spaces downstairs with the kitchen, meals and family room across the back; four bedrooms, a study and a rumpus
 * room upstairs. The stair rises in the entry hall.
 */
const FAMILY_HOME: ExamplePlan = {
  title: "Two-storey family home",
  note: "Four bedrooms, study, rumpus and double garage over two floors, 12 x 16 m",
  kind: "building",
  settings: { roof: { type: "gable", pitch: 22.5, overhang: 0.45 } },
  floors: [
    {
      name: "Ground floor",
      elevation: 0,
      height: 2.7,
      rooms: [
        room("Kitchen, meals and family", rect(0, 0, 12, 6), "tiles"),
        room("Guest bedroom", rect(0, 6, 3.6, 10), "carpet"),
        room("Powder room", rect(3.6, 6, 6, 7.6), "tiles"),
        room("Laundry", rect(3.6, 7.6, 6, 10), "tiles"),
        room("Entry hall", rect(6, 6, 7.6, 16), "tiles"),
        room("Media room", rect(7.6, 6, 12, 10.5), "carpet"),
        room("Lounge", rect(7.6, 10.5, 12, 16), "oak"),
        room("Garage", rect(0, 10, 6, 16), "concrete"),
      ],
      openings: [
        door(6.8, 16, 1.0),
        door(6.8, 6, 1.2),
        door(1.8, 6),
        door(6, 6.8, 0.72),
        door(6, 8.8),
        door(4.8, 10),
        door(7.6, 8.2),
        door(7.6, 12.2, 1.4),
        garage(3, 16, 4.8),
        door(0, 13),
        slider(4, 0, 2.1),
        window_(9.5, 0, 2.4),
        window_(0, 3, 1.8),
        window_(12, 3, 1.8),
        window_(0, 8, 1.5),
        window_(12, 8.2, 1.2),
        window_(9.8, 16, 2.4, 0.6, 1.6),
        window_(12, 13.2, 1.5),
      ],
      stairs: [{ at: [6.8, 11], width: 1.0, length: 4.0, rise: 3.0, rises: "-z" }],
    },
    {
      name: "First floor",
      elevation: 3.0,
      height: 2.55,
      rooms: [
        room("Bedroom 2", rect(0, 0, 4, 4), "carpet"),
        room("Bedroom 3", rect(4, 0, 8, 4), "carpet"),
        room("Bedroom 4", rect(8, 0, 12, 4), "carpet"),
        room(
          "Landing",
          [
            [0, 4],
            [12, 4],
            [12, 5.2],
            [7.6, 5.2],
            [7.6, 16],
            [6, 16],
            [6, 5.2],
            [0, 5.2],
          ],
          "carpet",
        ),
        room("Bathroom", rect(0, 5.2, 4, 7.6), "tiles"),
        room("WC and linen", rect(4, 5.2, 6, 7.6), "tiles"),
        room("Walk-in robe", rect(0, 7.6, 2.8, 11), "carpet"),
        room("Ensuite", rect(2.8, 7.6, 6, 11), "tiles"),
        room("Main bedroom", rect(0, 11, 6, 16), "carpet"),
        room("Study", rect(7.6, 5.2, 12, 10), "oak"),
        room("Rumpus", rect(7.6, 10, 12, 16), "carpet"),
      ],
      openings: [
        door(2, 4),
        door(5, 4),
        door(10, 4),
        door(2, 5.2),
        door(5, 5.2, 0.72),
        door(1.4, 11, 0.72),
        door(4.4, 11),
        door(6, 13.5),
        door(7.6, 7.5),
        door(7.6, 12.5, 1.4),
        window_(2, 0, 1.5),
        window_(6, 0, 1.5),
        window_(10, 0, 1.5),
        window_(12, 2, 1.2),
        window_(0, 6.4, 0.9, 1.4, 0.8),
        window_(3, 16, 2.4),
        window_(0, 13.5, 1.5),
        window_(12, 7.6, 1.5),
        window_(9.8, 16, 2.0),
        window_(12, 13, 1.5),
        window_(6.8, 16, 0.9, 0.6, 1.8),
      ],
    },
  ],
};

/**
 * A single-storey American ranch home with a full basement (20 x 11 m, plus the two-car garage beside it): the great
 * room, kitchen and dining across the middle, the primary suite at one end and two bedrooms off a hall at the other;
 * a recreation room, a fourth bedroom and the workshop and utility rooms below. Lengths show in feet and inches.
 */
const RANCH_HOME: ExamplePlan = {
  title: "Ranch home with a basement",
  note: "Single-storey American ranch, four bedrooms, full basement and two-car garage, 20 x 11 m",
  kind: "building",
  settings: { units: "imperial", roof: { type: "gable", pitch: 26.5, overhang: 0.45 } },
  floors: [
    {
      name: "Basement",
      elevation: -2.75,
      height: 2.45,
      rooms: [
        room("Recreation room", rect(0, 0, 11, 7), "carpet"),
        room("Bedroom 4", rect(0, 7, 4.5, 11), "carpet"),
        room("Stair hall", rect(4.5, 7, 8, 11), "concrete"),
        room("Bathroom 3", rect(8, 7, 11, 11), "tiles"),
        room("Workshop and storage", rect(11, 0, 20, 7), "concrete"),
        room("Utility room", rect(11, 7, 15, 11), "concrete"),
        room("Storage", rect(15, 7, 20, 11), "concrete"),
      ],
      openings: [
        door(4.5, 9),
        door(6.25, 7, 1.2),
        door(9.5, 7),
        door(11, 3.5, 1.6),
        door(13, 7),
        door(17.5, 7),
        window_(3, 0, 1.2, 1.7, 0.6),
        window_(8, 0, 1.2, 1.7, 0.6),
        window_(2.25, 11, 1.0, 1.0, 1.1),
        window_(16, 0, 1.2, 1.7, 0.6),
      ],
      stairs: [{ at: [7.4, 8.6], width: 1.0, length: 3.6, rise: 2.75, rises: "-z" }],
    },
    {
      name: "Main floor",
      elevation: 0,
      height: 2.75,
      rooms: [
        room("Bedroom 2", rect(0, 0, 4, 4), "carpet"),
        room("Bathroom 2", rect(0, 4, 4, 6.5), "tiles"),
        room("Bedroom 3", rect(0, 6.5, 4, 11), "carpet"),
        room("Hall", rect(4, 0, 5.4, 11), "oak"),
        room("Great room", rect(5.4, 0, 15, 6.5), "oak"),
        room("Foyer", rect(5.4, 6.5, 8, 11), "tiles"),
        room("Dining room", rect(8, 6.5, 11, 11), "oak"),
        room("Kitchen", rect(11, 6.5, 15, 11), "tiles"),
        room("Primary bedroom", rect(15, 0, 20, 5), "carpet"),
        room("Walk-in closet", rect(15, 5, 17.5, 8), "carpet"),
        room("Primary bath", rect(17.5, 5, 20, 8), "tiles"),
        room("Mudroom and laundry", rect(15, 8, 20, 11), "tiles"),
        room("Garage", rect(20, 4, 27, 11), "concrete"),
      ],
      openings: [
        door(6.7, 11, 0.95),
        door(6.7, 6.5, 1.5),
        door(9.5, 6.5, 1.8),
        door(13, 6.5, 2.1, "passage"),
        door(11, 8.8, 1.5, "passage"),
        door(5.4, 3.25),
        door(5.4, 9.5),
        door(4, 2),
        door(4, 5.25, 0.72),
        door(4, 8.75),
        door(15, 2.5),
        door(16.25, 5, 0.72),
        door(18.75, 5),
        door(15, 9.5),
        door(20, 9.5),
        garage(23.5, 11, 4.9),
        door(27, 6),
        slider(10.2, 0),
        window_(7.5, 0, 1.8),
        window_(13, 0, 1.8),
        window_(2, 0, 1.5),
        window_(0, 5.25, 0.8, 1.5, 0.6),
        window_(2, 11, 1.5),
        window_(0, 8.75, 1.2),
        window_(9.5, 11, 1.8),
        window_(13, 11, 1.5, 1.05, 1.1),
        window_(17.5, 0, 1.8),
        window_(20, 2.5, 1.2),
        window_(20, 6.5, 0.8, 1.5, 0.6),
        window_(17.5, 11, 0.9),
      ],
    },
  ],
};

/**
 * A large single-storey home for an acreage block (40 x 13 m with its garage): a children's wing of four bedrooms with
 * their bathroom and rumpus room, the open kitchen, meals and family room in the middle with the entry, study and
 * lounge in front of it, and the main bedroom wing with the laundry and a triple garage at the other end.
 */
const ACREAGE_HOME: ExamplePlan = {
  title: "Acreage home",
  note: "Large single-storey home, five bedrooms, rumpus, study and triple garage, 40 x 13 m",
  kind: "building",
  settings: { roof: { type: "gable", pitch: 22.5, overhang: 0.6 } },
  floors: [
    {
      name: "Ground floor",
      elevation: 0,
      height: 2.7,
      rooms: [
        room("Bedroom 2", rect(0, 0, 4, 5.6), "carpet"),
        room("Bathroom", rect(4, 0, 6.6, 5.6), "tiles"),
        room("Bedroom 3", rect(6.6, 0, 10.4, 5.6), "carpet"),
        room("Corridor", rect(0, 5.6, 10.4, 7), "oak"),
        room("Bedroom 4", rect(0, 7, 4, 10), "carpet"),
        room("Bedroom 5", rect(0, 10, 4, 13), "carpet"),
        room("Rumpus", rect(4, 7, 10.4, 13), "carpet"),
        room("Kitchen, meals and family", rect(10.4, 0, 24, 7.5), "tiles"),
        room("Entry", rect(10.4, 7.5, 13, 13), "tiles"),
        room("Study", rect(13, 7.5, 16.5, 13), "oak"),
        room("Lounge", rect(16.5, 7.5, 24, 13), "oak"),
        room("Main bedroom", rect(24, 0, 30, 5.6), "carpet"),
        room("Hall", rect(24, 5.6, 25.4, 13), "oak"),
        room("Walk-in robe", rect(25.4, 5.6, 27.5, 9), "carpet"),
        room("Ensuite", rect(27.5, 5.6, 30, 9), "tiles"),
        room("Laundry", rect(25.4, 9, 30, 13), "tiles"),
        room("Garage", rect(30, 6.5, 39.6, 13), "concrete"),
      ],
      openings: [
        door(2, 5.6),
        door(5.3, 5.6, 0.72),
        door(8.5, 5.6),
        door(2, 7),
        door(7, 7, 1.4),
        door(4, 11.5),
        door(10.4, 6.3, 1.0),
        door(11.7, 13, 1.2, "front_glass"),
        door(11.7, 7.5, 1.4),
        door(13, 10.25),
        door(20, 7.5, 1.8),
        door(24, 6.55),
        door(24.7, 5.6),
        door(26.45, 5.6, 0.72),
        door(28.75, 5.6),
        door(25.4, 11),
        door(30, 11),
        garage(31.8, 13, 2.6),
        garage(34.8, 13, 2.6),
        garage(37.8, 13, 2.6),
        door(39.6, 9.5),
        slider(14, 0),
        slider(20, 0),
        window_(11.8, 0, 1.2, 1.05, 1.1),
        window_(17, 0, 2.0),
        window_(2, 0, 1.8),
        window_(5.3, 0, 0.9, 1.4, 0.8),
        window_(8.5, 0, 1.8),
        window_(0, 8.5, 1.5),
        window_(0, 11.5, 1.5),
        window_(2, 13, 1.5),
        window_(7.2, 13, 2.4),
        window_(14.75, 13, 1.8),
        window_(20.25, 13, 3.0, 0.6, 1.6),
        window_(27, 0, 2.4),
        window_(30, 2.8, 1.5),
        window_(30, 7.3, 1.0, 1.4, 0.8),
        window_(27.7, 13, 1.2),
      ],
    },
  ],
};

/**
 * A small laboratory suite for making peptides to order (20 x 13.5 m, inside a larger building): the clean side, with
 * synthesis, purification, freeze-drying and a cold store off a clean corridor, entered only through the gowning room
 * and the personnel airlock (people) or the material airlock (goods); quality control, the wash room and the office
 * along the outer corridor. A fit-out of rooms, not a building: no roof.
 */
const PEPTIDE_LAB: ExamplePlan = {
  title: "Peptide laboratory",
  note: "A small custom peptide lab: clean suite behind personnel and material airlocks, 20 x 13.5 m",
  kind: "rooms",
  settings: { wall_exterior: 0.2, wall_interior: 0.1 },
  floors: [
    {
      name: "Laboratory",
      elevation: 0,
      height: 3.0,
      rooms: [
        room("Plant room", rect(0, 0, 4, 8), "concrete"),
        room("Synthesis laboratory", rect(4, 0, 11, 6.5), "stone"),
        room("Purification", rect(11, 0, 15.5, 6.5), "stone"),
        room("Freeze-drying", rect(15.5, 0, 20, 3.5), "stone"),
        room("Cold store", rect(15.5, 3.5, 20, 6.5), "stone"),
        room("Clean corridor", rect(4, 6.5, 20, 8), "stone"),
        room("Gowning room", rect(0, 8, 4, 11), "tiles"),
        room("Personnel airlock", rect(4, 8, 6, 11), "stone"),
        room("Material airlock", rect(6, 8, 8, 11), "stone"),
        room("Quality control", rect(8, 8, 13, 11), "tiles"),
        room("Wash room", rect(13, 8, 16, 11), "tiles"),
        room("Office", rect(16, 8, 20, 11), "carpet"),
        room("Corridor", rect(0, 11, 20, 13.5), "tiles"),
      ],
      openings: [
        door(0, 4, 1.2),
        door(2, 11),
        door(4, 9.5),
        door(5, 8),
        door(7, 8, 1.0),
        door(7, 11, 1.0),
        door(10.5, 11),
        door(14.5, 8),
        door(18, 11),
        door(7.5, 6.5, 1.2),
        door(13.25, 6.5, 1.0),
        door(15.5, 1.75, 1.0),
        door(17.75, 6.5, 1.0),
        door(20, 12.25, 1.0, "front_glass"),
        window_(9.5, 6.5, 1.8, 1.0, 1.2),
        window_(12, 11, 1.5, 1.0, 1.2),
        window_(20, 9.5, 1.5),
        window_(16, 13.5, 2.4),
        window_(6, 13.5, 2.4),
      ],
    },
  ],
};

/**
 * A real estate agency's shopfront office for eight staff (16 x 12 m): reception and waiting behind the display
 * windows with an interview room either side, the open office for the sales team, offices for the principal and for
 * property management, and the kitchen, washrooms and records room along the back.
 */
const AGENCY_OFFICE: ExamplePlan = {
  title: "Real estate office",
  note: "A shopfront office for eight staff: reception, two interview rooms, open office, kitchen and washrooms, 16 x 12 m",
  kind: "rooms",
  settings: { wall_exterior: 0.2, wall_interior: 0.1 },
  floors: [
    {
      name: "Office",
      elevation: 0,
      height: 2.7,
      rooms: [
        room("Interview room 1", rect(0, 8.5, 3.5, 12), "carpet"),
        room("Reception and waiting", rect(3.5, 8.5, 12.5, 12), "tiles"),
        room("Interview room 2", rect(12.5, 8.5, 16, 12), "carpet"),
        room("Open office", rect(0, 3, 11, 8.5), "carpet"),
        room("Principal's office", rect(11, 0, 16, 4.5), "carpet"),
        room("Property management", rect(11, 4.5, 16, 8.5), "carpet"),
        room("Kitchen", rect(0, 0, 4.5, 3), "tiles"),
        room("Accessible washroom", rect(4.5, 0, 7, 3), "tiles"),
        room("Washroom", rect(7, 0, 8.8, 3), "tiles"),
        room("Print and records", rect(8.8, 0, 11, 3), "carpet"),
      ],
      openings: [
        door(8, 12, 1.8, "front_glass"),
        door(3.5, 10.25),
        door(12.5, 10.25),
        door(5.5, 8.5, 1.6, "passage"),
        door(11, 3.75),
        door(11, 6.5),
        door(2.25, 3),
        door(5.75, 3, 0.95),
        door(7.9, 3, 0.72),
        door(9.9, 3),
        door(1, 0, 0.9),
        window_(5.6, 12, 3.2, 0.3, 2.2),
        window_(10.6, 12, 3.2, 0.3, 2.2),
        window_(1.75, 12, 2.0, 0.6, 1.8),
        window_(14.25, 12, 2.0, 0.6, 1.8),
        window_(13.5, 0, 2.0),
        window_(16, 2.25, 1.5),
        window_(16, 6.5, 1.5),
        window_(11, 1.6, 1.2, 1.0, 1.2),
        window_(0, 5.75, 2.0),
      ],
    },
  ],
};

/**
 * A steel shed for two cars and a workshop (10 x 10 m, 3.3 m walls): the double garage bay with two roller doors,
 * the workshop beside it with a roller door of its own and a side door, and a lockable store at the back.
 */
const SHED_WORKSHOP: ExamplePlan = {
  title: "Shed and workshop",
  note: "A 10 x 10 m steel shed: oversized double garage, workshop and store",
  kind: "building",
  settings: { wall_exterior: 0.12, wall_interior: 0.1, roof: { type: "gable", pitch: 11, overhang: 0.3 } },
  floors: [
    {
      name: "Shed",
      elevation: 0,
      height: 3.3,
      rooms: [room("Garage", rect(0, 0, 6.5, 10), "concrete"), room("Workshop", rect(6.5, 3, 10, 10), "concrete"), room("Store", rect(6.5, 0, 10, 3), "concrete")],
      openings: [
        garage(1.6, 10, 2.7, 2.4),
        garage(4.9, 10, 2.7, 2.4),
        garage(8.25, 10, 2.4, 2.4),
        door(10, 6),
        door(6.5, 6.5),
        door(8.25, 3),
        window_(0, 5, 1.2, 1.2, 1.0),
        window_(10, 8.4, 1.2, 1.2, 1.0),
        window_(10, 1.5, 0.9, 1.4, 0.8),
      ],
    },
  ],
};

export const EXAMPLE_PLANS: Record<string, ExamplePlan> = {
  "family-home-two-storey": FAMILY_HOME,
  "ranch-home-basement": RANCH_HOME,
  "acreage-home": ACREAGE_HOME,
  "peptide-lab": PEPTIDE_LAB,
  "real-estate-office": AGENCY_OFFICE,
  "shed-workshop": SHED_WORKSHOP,
};

/** Plans drawn in a vessel (vessel/): the boat's recipe, its decks made from it. */
export const EXAMPLE_VESSELS: Record<string, { title: string; note: string; spec: VesselSpec }> = {
  "fishing-boat-6.5m": {
    title: "Plate alloy fishing boat",
    note: "A 6.5 m open plate aluminium boat: a self-draining sole, and a motor well behind the transom's cut-out for twin outboards",
    spec: {
      hull: { plate: PLATE_FISHING_6_5 },
      open: { plating: 0.005, sole: 0.15, transom: { height: SHAFT.xl, width: 1.4, well: 0.75 } },
      outboards: 2,
      components: [
        // twin 150 hp outboards on their mounts, the leg down past the bottom of the boat
        { name: "Outboard 1", mass: 230, size: [0.8, 1.6, 0.6], mount: "outboard 1", offset: [-0.45, 0.1, 0] },
        { name: "Outboard 2", mass: 230, size: [0.8, 1.6, 0.6], mount: "outboard 2", offset: [-0.45, 0.1, 0] },
        { name: "Fuel tank, 200 L", mass: 160, size: [1.2, 0.3, 0.8], at: [2.0, -0.05, 0] },
        { name: "Battery", mass: 30, size: [0.35, 0.25, 0.2], at: [0.4, 0.38, 0.5] },
      ],
    },
  },
};

const ROTATION: Record<ExampleStairs["rises"], number> = { "-z": 0, "+x": 90, "+z": 180, "-x": 270 };

function rawFloor(f: ExampleFloor): RawFloor {
  return {
    name: f.name,
    elevation: f.elevation,
    height: f.height,
    rooms: f.rooms.map((r) => ({ name: r.name, points: r.points })),
    walls: [],
    openings: f.openings.map((o): RawOpening => ({ kind: o.kind, at: o.at, width: o.width, height: o.height, sill: o.sill })),
    furniture: (f.stairs ?? []).map((s) => ({ name: "Stairs", type: "stairs", x: s.at[0], z: s.at[1], w: s.width, d: s.length, h: s.rise, rotation: ROTATION[s.rises] })),
  };
}

/** An example as a plan, with what the importer had to say about it (an example should give no warnings). */
export function examplePlan(name: string): { building: Building; warnings: Warning[] } {
  const vessel = EXAMPLE_VESSELS[name];
  if (vessel) return { building: vesselBuilding(vessel.spec), warnings: [] };
  const plan = EXAMPLE_PLANS[name];
  if (!plan) throw new Error(`no example plan "${name}"`);
  const { building, warnings } = buildPlan({ source: "Axonometra", floors: plan.floors.map(rawFloor) }, { lang: "en", square: false });
  // the importer sorts the floors by elevation; ours are listed that way already
  building.floors.forEach((floor, i) => {
    const spec = plan.floors[i];
    const material = new Map(spec.rooms.map((r) => [r.name, r.material]));
    for (const r of floor.rooms) r.floor_material = material.get(r.name) ?? r.floor_material;
    for (const o of floor.openings) {
      const room = floor.rooms.find((r) => r.id === o.room_id)!;
      const at = pointOnRoomEdge(room, o.edge, o.offset);
      const own = nearest(spec.openings, at);
      if (own?.style) o.style = own.style;
    }
  });
  const { roof, ...rest } = plan.settings ?? {};
  Object.assign(building.settings, rest);
  if (roof) building.settings.roof = { ...roof };
  return { building, warnings };
}

function nearest(openings: ExampleOpening[], at: Vec2): ExampleOpening | null {
  let best: ExampleOpening | null = null;
  let d = 0.5;
  for (const o of openings) {
    const e = Math.hypot(o.at[0] - at[0], o.at[1] - at[1]);
    if (e < d) [best, d] = [o, e];
  }
  return best;
}
