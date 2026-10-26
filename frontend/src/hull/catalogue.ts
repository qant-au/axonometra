// The hull viewer's catalogue: every kind of hull the hull code builds, each as a hull, the parts on it and a note.
// The Ship-D examples come in at their real sizes; the rest are built here from the round-hull, forms, tube and
// parts builders.

import { SHIPD_EXAMPLES } from "./examples.ts";
import { asymmetricBody, foilOutrigger, outriggerBodies, placeBody, steppedBody, strutBody } from "./forms.ts";
import { parametricHull } from "./parametric.ts";
import { plateHull } from "./plate.ts";
import { bulbGeometry, foilGeometry, type FoilSpec, type PartGeometry } from "./parts.ts";
import { pontoonBody, revolutionBody } from "./revolution.ts";
import { shipdBody } from "./shipd.ts";
import { ribTube, type Tube } from "./tube.ts";
import type { Hull } from "./types.ts";

export interface CatalogueHull {
  hull: Hull;
  /** Parts fixed to it that the view draws: foils, bulbs and the like. */
  parts?: PartGeometry[];
  tubes?: Tube[];
  /** Where the water is (m, the hull's frame) when it floats as built; 0 unless it is a submerged hull. */
  waterline?: number;
}

export interface CatalogueEntry {
  name: string;
  group: string;
  note: string;
  build: () => CatalogueHull;
}

const GROUPS: Record<string, string> = {
  "runabout-4.5m": "Small craft",
  "rib-6.5m": "Small craft",
  "planing-cruiser-12m": "Small craft",
  "police-launch-11m": "Small craft",
  "ocean-racer-18m": "Sail",
  "sailing-yacht-10m": "Sail",
  "double-ender-8m": "Sail",
  "three-master-52m": "Sail",
  "trawler-14m": "Motor",
  "sailing-barge-25m": "Working",
  "patrol-boat-26.5m": "Patrol and naval",
  "missile-boat-39m": "Patrol and naval",
  "coastguard-cutter-127m": "Patrol and naval",
  "lcs-freedom-118m": "Patrol and naval",
  "lcs-independence-127m": "Multihulls",
  "frigate-136m": "Patrol and naval",
  "ddg-1000-186m": "Patrol and naval",
  "ddg-1000-wave-piercer-186m": "Patrol and naval",
  "aircraft-carrier-333m": "Patrol and naval",
  "container-ship-300m": "Ships",
  "tanker-250m": "Ships",
  "lcs-model-1.18m": "Models",
  "catamaran-12m": "Multihulls",
  "submarine-shipd-attempt": "Submersibles",
};

const shipd = (name: string): CatalogueHull => {
  const e = SHIPD_EXAMPLES.find((x) => x.name === name)!;
  return { hull: { bodies: e.bodies.map((b) => shipdBody(b.vector, { center: b.center, aft: b.aft })) } };
};

/** A body of revolution with a rounded nose and a tapering tail (a Myring-type profile), x from the stern. */
const submarineRadius = (L: number, D: number, nose: number, tail: number) => (x: number) => {
  const R = D / 2;
  if (x > L - nose * L) return R * Math.sqrt(Math.max(0, 1 - ((x - (L - nose * L)) / (nose * L)) ** 2));
  if (x < tail * L) return R * (1 - ((tail * L - x) / (tail * L)) ** 2);
  return R;
};

const foils = (specs: FoilSpec[]) => specs.map((f) => foilGeometry(f));

export const CATALOGUE: CatalogueEntry[] = [
  ...SHIPD_EXAMPLES.map((e) => ({ name: e.name, group: GROUPS[e.name] ?? "Other", note: e.note, build: () => shipd(e.name) })),
  {
    name: "rib-6.5m-with-tube",
    group: "Small craft",
    note: "RIB: the deep-V hull with its 0.5 m tube",
    build: () => {
      const { hull } = shipd("rib-6.5m");
      return { hull, tubes: [ribTube(hull.bodies[0], { diameter: 0.5 })] };
    },
  },
  {
    name: "plate-alloy-fishing-6.5m",
    group: "Small craft",
    note: "plate aluminium fishing boat: hard chine, 18° deadrise aft, a wide transom for twin outboards",
    build: () => ({ hull: plateHull({ length: 6.5, beam: 2.45, transom: 2.3, chineBeam: 2.0, draft: 0.3, freeboard: 0.9, deadrise: 18 }) }),
  },
  {
    name: "stepped-planing-10m",
    group: "Small craft",
    note: "a planing hull with two steps in its bottom",
    build: () => ({ hull: { bodies: [steppedBody(parametricHull({ hull: "monohull", length: 10, beam: 3, draft: 0.6, freeboard: 1.0 }).bodies[0], [{ x: 4, height: 0.05 }, { x: 6, height: 0.04 }])] } }),
  },
  {
    name: "sailing-yacht-10m-keel",
    group: "Sail",
    note: "the sailing yacht's canoe body with a fin keel, its bulb and a spade rudder",
    build: () => {
      const { hull } = shipd("sailing-yacht-10m");
      return {
        hull,
        parts: [
          ...foils([
            { root: [5.6, -0.5, 0], rootChord: 1.1, tipChord: 0.75, span: 1.2, sweep: 12, thickness: 0.12 },
            { root: [1.4, -0.35, 0], rootChord: 0.45, tipChord: 0.32, span: 1.1, sweep: 6, thickness: 0.12 },
          ]),
          bulbGeometry({ nose: [5.55, -1.7, 0], length: 1.8, diameter: 0.38 }),
        ],
      };
    },
  },
  {
    name: "houseboat-12m",
    group: "Pontoon",
    note: "houseboat on two 0.64 m aluminium pontoons 2.4 m apart",
    build: () => ({ hull: { bodies: [-1.2, 1.2].map((c) => pontoonBody({ length: 12, diameter: 0.64, axis: 0.02, center: c, tail: 0.3 })) } }),
  },
  {
    name: "tritoon-8m",
    group: "Pontoon",
    note: "pontoon boat on three 0.64 m tubes",
    build: () => ({ hull: { bodies: [-1.0, 0, 1.0].map((c) => pontoonBody({ length: 8, diameter: 0.64, axis: 0.05, center: c, nose: 1.2 })) } }),
  },
  {
    name: "asymmetric-catamaran-12m",
    group: "Multihulls",
    note: "catamaran on asymmetric demihulls, flat inboard",
    build: () => {
      const demi = parametricHull({ hull: "monohull", length: 12, beam: 1.6, draft: 0.7, freeboard: 1.0 }).bodies[0];
      return { hull: { bodies: [placeBody(asymmetricBody(demi, 1, 0.4), -2.6), placeBody(asymmetricBody(demi, -1, 0.4), 2.6)] } };
    },
  },
  {
    name: "swath-25m",
    group: "Multihulls",
    note: "SWATH: two submerged hulls under thin struts",
    build: () => ({
      hull: {
        bodies: [-4, 4].flatMap((c) => [
          revolutionBody(25, submarineRadius(25, 2.2, 0.15, 0.3), { axis: -2.6, center: c }),
          strutBody({ length: 18, thickness: 0.7, bottom: -1.5, top: 3, center: c, aft: 3 }),
        ]),
      },
    }),
  },
  {
    name: "outrigger-canoe-6m",
    group: "Outriggers",
    note: "a canoe with a single outrigger float to starboard",
    build: () => {
      const canoe = revolutionBody(6, (x) => 0.35 * Math.sqrt(Math.max(0, 1 - ((2 * x) / 6 - 1) ** 2)) ** 0.5, { axis: 0.1 });
      return { hull: { bodies: [canoe, ...outriggerBodies(pontoonBody({ length: 4, diameter: 0.25, axis: 0.05, nose: 0.4 }), { spacing: 2, side: 1, shift: 1 })] } };
    },
  },
  {
    name: "double-outrigger-7m",
    group: "Outriggers",
    note: "a canoe with a float each side",
    build: () => {
      const canoe = revolutionBody(7, (x) => 0.4 * Math.sqrt(Math.max(0, 1 - ((2 * x) / 7 - 1) ** 2)) ** 0.5, { axis: 0.1 });
      return { hull: { bodies: [canoe, ...outriggerBodies(pontoonBody({ length: 4.5, diameter: 0.28, axis: 0.08, nose: 0.5 }), { spacing: 2.2, side: 0, shift: 1.2 })] } };
    },
  },
  {
    name: "foil-outrigger-trimaran-9m",
    group: "Outriggers",
    note: "a slender main hull with hydrofoil outriggers either side",
    build: () => {
      const main = revolutionBody(9, (x) => 0.5 * Math.sqrt(Math.max(0, 1 - ((2 * x) / 9 - 1) ** 2)) ** 0.6, { axis: 0.15 });
      return {
        hull: { bodies: [main] },
        parts: foils([-1, 1].flatMap((side) => foilOutrigger({ at: [4, 0.4, side * 2.4], strut: 1.1, strutChord: 0.22, span: 0.9, chord: 0.26, incidence: 3 }))),
      };
    },
  },
  {
    name: "submarine-115m",
    group: "Submersibles",
    note: "attack submarine type body of revolution, submerged",
    build: () => ({ hull: { bodies: [revolutionBody(115, submarineRadius(115, 10.4, 0.1, 0.25))] }, waterline: 25 }),
  },
  {
    name: "research-sub-7m",
    group: "Submersibles",
    note: "small research submersible, submerged",
    build: () => ({ hull: { bodies: [revolutionBody(7.1, submarineRadius(7.1, 2.6, 0.3, 0.3))] }, waterline: 6 }),
  },
];
