// Axonometra: a few hulls picked from the Ship-D dataset itself (Bagazinski and Ahmed 2023, Harvard Dataverse
// doi:10.7910/DVN/MMGAUS, CC0 1.0), Constrained_Randomized_Set_1: no bulbous bow or stern, small-craft proportions
// (length up to 3.6 beams, depth at least 0.12 of the length, waterline 30 to 60 % of the depth), feasible under the
// 49 constraints, and conventional in shape: a full deck (at least 72 % of length × beam), a waterline at least 85 % of
// the length, no flare past the deck's breadth, a block coefficient of 0.3 to 0.65. Of the 455 small-craft hulls in
// the set only 12 pass that; these are the fullest of them per kind of deadrise and chine. (Most of the set is random
// on purpose: winged decks, needle bows.) The dataset's hulls are 10 m long; the catalogue shows them at 8 m. The rest
// of the dataset is not bundled: parseShipDVectors reads a set downloaded from the deposit.

import { shipdFeasible } from "./shipd.ts";

export interface ShipDDatasetHull {
  /** The row in Constrained_Randomized_Set_1/Input_Vectors (1 = the first hull after the header). */
  row: number;
  note: string;
  vector: number[];
}

export const SHIPD_DATASET: ShipDDatasetHull[] = [
  { row: 9600, note: "deep V with a raked, overhanging bow, 30° deadrise, L/B 3.4", vector: [10, 0.084025401, 0.541231711, 0.29359086, 0.178217049, 0.742357173, 0.368423071, 0.329793408, 30.445395067, 0.633078273, -0.085563597, 3.402327337, -3.175074212, 0.386759499, 0.862828383, -1.690514397, 1.323378659, -1.621146843, 1.611224842, 41.449156275, 0, 1, 2.853619034, 0.846828135, 0.654477286, 2.319622772, -1.992830144, 2.863771057, 0.262093739, 0.264696566, 0.098931985, 0, 0, 0.093018911, 0.482951636, 0.107892292, -0.565935248, 0.155567726, 0.304438379, 0.099343877, 0.799872542, 0.751695782, 0.82636143, 0.669080254, 0.086829202] },
  { row: 3354, note: "low round-bilge displacement form, 7° deadrise, L/B 3.4", vector: [10, 0.511570956, 0.411040311, 0.295108756, 0.210904432, 0.762954803, 0.593350883, 0.214883392, 7.300062847, 0.77594212, 0.642909846, 2.459811239, -2.034832738, 0.169730136, 0.395013999, -2.664211479, 2.901268315, -0.524767873, 1.117970778, 16.33523395, 1, 1, 1.183720117, 0.124426139, 0.303425457, -2.883026256, 2.75341466, 51.061721789, 0.072090191, 0.416917295, -0.351715296, 0, 0, 0.186196982, 0.060072762, 0.476057693, 0.770994888, 0.308420335, 0.722924172, 0.028387342, 0.909999934, 0.331834876, 0.359397435, 0.494085192, 0.316808589] },
  { row: 6126, note: "slab-sided workboat form with a plumb bow, 24° deadrise, L/B 3.3", vector: [10, 0.241367142, 0.238310806, 0.30152676, 0.228512709, 0.902238678, 0.318043796, 0.291949655, 24.367650521, 0.235290659, 0.642907141, -1.825361959, 1.168223592, 0.975483987, 0.033595791, -1.129098461, 0.847992943, -0.918137993, 1.452138253, 28.930935235, 1, 0, 0.230680616, 0.207691563, 0.518693353, -0.371542523, 1.132014883, 36.46478288, 0.213355774, 0.177866801, -0.362633073, 0, 0, 0.076843397, 0.539619251, 0.521097578, -0.941915458, 0.271008685, 0.863613076, 0.095130294, 0.850669895, 0.457045604, 0.909755569, -0.64703725, 0.193593177] },
];

/** The dataset's vectors are 45 numbers; its parameter names head the file. */
const WIDTH = 45;

/**
 * Hulls from an Input_Vectors file of the Ship-D deposit (comma or tab separated, a header line or none): the rows of
 * 45 numbers, each with its line number. Rows that are not 45 numbers are skipped; with `feasible`, so are the hulls
 * that break a constraint.
 */
export function parseShipDVectors(text: string, options: { feasible?: boolean; bulbs?: boolean } = {}): { row: number; vector: number[] }[] {
  const out: { row: number; vector: number[] }[] = [];
  let row = 0;
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const cells = line.split(/[,\t]/).map((c) => c.trim());
    const vector = cells.map(Number);
    if (vector.some((x, i) => cells[i] === "" || !Number.isFinite(x))) {
      if (row === 0) continue; // the header
      row++;
      continue;
    }
    row++;
    if (vector.length !== WIDTH) continue;
    if (options.bulbs === false && (vector[31] !== 0 || vector[32] !== 0)) continue;
    if (options.feasible && !shipdFeasible(vector)) continue;
    out.push({ row, vector });
  }
  return out;
}
