// The Ship-D hull parameterisation: 45 numbers that describe a hull (principal dimensions, the midship section,
// the bow and stern forms, bulbous bow and stern), and the 49 algebraic constraints that keep it watertight and
// free of self-intersection. Ported from HullParameterization.py by Noah J. Bagazinski (Bagazinski and Ahmed,
// "Ship-D: Ship Hull Dataset for Design Optimization using Machine Learning", 2023), as published in
// https://github.com/noahbagz/C_ShipGen under the MIT licence (see NOTICE). The functions keep the original's
// names and order so the two can be read side by side.
//
// The original's frame: x from the bow (0) aft to the transom (LOA), z up from the keel (0) to the deck (Dd), y the
// half-breadth. A hull is described at heights z as waterlines; shipdBody turns those into the sections of the
// hull interface (x from the stern forward, y from the waterline WL).

import { halfAt } from "./sections.ts";
import type { HullBody, Section, SectionPoint } from "./types.ts";

/** The 45 parameters in vector order, as the dataset labels them. */
export const SHIPD_PARAMETERS = [
  "LOA", "Lb", "Ls", "Bd", "Dd", "Bs", "WL", "Bc", "Beta", "Rc", "Rk", "Abow", "Bbow", "BK_z", "Kappa_bow", "Adel bow",
  "Bdel bow", "Adrft", "Bdrft", "Cdrft", "bit_EP_S", "bit_EP_T", "Atrans", "SK_z", "Kappa_stern", "Adel stern",
  "Bdel stern", "Beta trans", "Bc trans", "Rc Trans", "Rk trans", "bit_BB", "bit_SB", "Lbb", "Hbb", "Bbb", "Lbbm", "Rbb",
  "Kappa_SB", "Lsb", "HSBOA", "Hsb", "Bsb", "Lsbm", "Rsb",
] as const;

type Vec = number[];

const sign = (v: number) => (v > 0 ? 1 : v < 0 ? -1 : 0);
/** The square root of a radius term; at a knuckle height rounding can take it a hair below 0 (numpy gives NaN). */
const root = (v: number) => Math.sqrt(Math.max(0, v));

/** Solve A x = b (Gaussian elimination, partial pivoting); throws on a singular matrix, as numpy does. */
function solve(A: number[][], b: number[]): Vec {
  const n = b.length;
  const m = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(m[r][c]) > Math.abs(m[p][c])) p = r;
    if (Math.abs(m[p][c]) < 1e-300) throw new Error("singular matrix");
    [m[c], m[p]] = [m[p], m[c]];
    for (let r = c + 1; r < n; r++) {
      const f = m[r][c] / m[c][c];
      for (let k = c; k <= n; k++) m[r][k] -= f * m[c][k];
    }
  }
  const x = new Array<number>(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = m[r][n];
    for (let k = r + 1; k < n; k++) s -= m[r][k] * x[k];
    x[r] = s / m[r][r];
  }
  return x;
}

/** The roots of a polynomial (highest power first, leading zeros dropped) as [re, im], like numpy's roots. */
export function roots(coeffs: Vec): [number, number][] {
  let c = [...coeffs];
  while (c.length && c[0] === 0) c.shift();
  // numpy drops trailing zeros as roots at 0
  let zeros = 0;
  while (c.length > 1 && c[c.length - 1] === 0) {
    c.pop();
    zeros++;
  }
  const out: [number, number][] = Array.from({ length: zeros }, () => [0, 0] as [number, number]);
  const n = c.length - 1;
  if (n < 1) return out;
  c = c.map((v) => v / c[0]);
  if (n === 1) return [...out, [-c[1], 0]];
  if (n === 2) {
    const d = c[1] * c[1] - 4 * c[2];
    if (d >= 0) {
      const s = Math.sqrt(d);
      return [...out, [(-c[1] + s) / 2, 0], [(-c[1] - s) / 2, 0]];
    }
    const s = Math.sqrt(-d);
    return [...out, [-c[1] / 2, s / 2], [-c[1] / 2, -s / 2]];
  }
  // Durand–Kerner for the cubic (and anything higher)
  type C = [number, number];
  const mul = (a: C, b: C): C => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
  const sub = (a: C, b: C): C => [a[0] - b[0], a[1] - b[1]];
  const div = (a: C, b: C): C => {
    const d = b[0] * b[0] + b[1] * b[1];
    return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d];
  };
  const evalAt = (z: C): C => c.reduce<C>((acc, k) => [mul(acc, z)[0] + k, mul(acc, z)[1]], [0, 0]);
  const r0 = 1 + Math.max(...c.slice(1).map(Math.abs));
  let z: C[] = Array.from({ length: n }, (_, k) => {
    const a = (2 * Math.PI * k) / n + 0.4;
    return [r0 * Math.cos(a), r0 * Math.sin(a)];
  });
  for (let it = 0; it < 500; it++) {
    let moved = 0;
    z = z.map((zi, i) => {
      let den: C = [1, 0];
      for (let j = 0; j < n; j++) if (j !== i) den = mul(den, sub(zi, z[j]));
      const next = sub(zi, div(evalAt(zi), den));
      moved = Math.max(moved, Math.hypot(next[0] - zi[0], next[1] - zi[1]));
      return next;
    });
    if (moved < 1e-14 * r0) break;
  }
  return [...out, ...z.map(([re, im]): [number, number] => [re, Math.abs(im) < 1e-10 * r0 ? 0 : im])];
}

/** numpy's ordering of a complex number against a real one (lexicographic: the real part, then the imaginary). */
const geq = ([re, im]: [number, number], v: number) => re > v || (re === v && im >= 0);

/** A hull built from a Ship-D vector: the original's constants and functions. */
export class ShipD {
  LOA: number; Lb: number; Ls: number; Bd: number; Dd: number; Bs: number; WL: number; Bc: number; Beta: number;
  Rc: number; Rk: number; BOW: Vec; BK: Vec; Kappa_BOW: number; DELTA_BOW: Vec; DRIFT: Vec; bit_EP_S: number;
  bit_EP_T: number; TRANS: Vec; SK: Vec; Kappa_STERN: number; DELTA_STERN: Vec; Beta_trans: number; Bc_trans: number;
  Rc_trans: number; Rk_trans: number; bit_BB: number; bit_SB: number; Lbb: number; Hbb: number; Bbb: number;
  Lbbm: number; Rbb: number; Kappa_SB: number; Lsb: number; HSBOA: number; Hsb: number; Bsb: number; Lsbm: number;
  Rsb: number;
  Lm = 0; Rk_Center: Vec = []; Rk_LG_int: Vec = []; LG: Vec = []; Dc = 0; UG: Vec = []; Rc_UG_int: Vec = [];
  Rc_LG_int: Vec = []; Rc_Center: Vec = []; KEEL_BOW = 0; STERNRISE = 0; Rk_Center_trans: Vec = [];
  Rk_LG_int_trans: Vec = []; LG_trans: Vec = []; Dc_trans = 0; UG_trans: Vec = []; Rc_UG_int_trans: Vec = [];
  Rc_LG_int_trans: Vec = []; Rc_Center_trans: Vec = []; BB_Prof: Vec = new Array(7).fill(0);
  SB_Prof: Vec = new Array(7).fill(0);

  constructor(inputs: readonly number[]) {
    if (inputs.length !== 45) throw new Error(`a Ship-D vector has 45 numbers, not ${inputs.length}`);
    const v = inputs;
    this.LOA = v[0];
    this.Lb = v[1] * this.LOA;
    this.Ls = v[2] * this.LOA;
    this.Bd = (v[3] / 2) * this.LOA;
    this.Dd = v[4] * this.LOA;
    this.Bs = v[5] * this.Bd;
    this.WL = v[6] * this.Dd;
    this.Bc = (v[7] / 2) * this.LOA;
    this.Beta = v[8];
    this.Rc = v[9] * this.Bc;
    this.Rk = v[10] * this.Dd;
    this.BOW = [(v[11] * 0.5 * this.Lb) / this.Dd ** 2, (v[12] * 0.5 * this.Lb) / this.Dd, 0];
    this.BK = [0, v[13] * this.Dd];
    this.Kappa_BOW = v[14];
    this.DELTA_BOW = [(v[15] * 0.5 * this.Lb) / this.Dd ** 2, (v[16] * 0.5 * this.Lb) / this.Dd, 0];
    this.DRIFT = [(v[17] * 60) / this.Dd ** 2, (v[18] * 60) / this.Dd, v[19]];
    this.bit_EP_S = v[20];
    this.bit_EP_T = v[21];
    this.TRANS = [v[22], 0];
    this.SK = [0, v[23]];
    this.Kappa_STERN = v[24];
    this.DELTA_STERN = [(v[25] * 0.5 * this.Ls) / this.Dd ** 2, (v[26] * 0.5 * this.Ls) / this.Dd, 0];
    this.Beta_trans = v[27];
    this.Bc_trans = (v[28] / 2) * this.LOA;
    this.Rc_trans = v[29] * this.Bc_trans;
    this.Rk_trans = v[30] * this.Dd * (1 - this.SK[1]);
    this.bit_BB = v[31];
    this.bit_SB = v[32];
    this.Lbb = v[33];
    this.Hbb = v[34];
    this.Bbb = v[35];
    this.Lbbm = v[36];
    this.Rbb = v[37];
    this.Kappa_SB = v[38];
    this.Lsb = v[39];
    this.HSBOA = v[40];
    this.Hsb = v[41];
    this.Bsb = v[42];
    this.Lsbm = v[43];
    this.Rsb = v[44];
    this.GenGeneralHullform();
    this.GenCrossSection();
    this.GenBowForm();
    this.GenSternForm();
    this.GenBulbForms();
  }

  // Section 1: general hull form

  GenGeneralHullform(): void {
    this.Lm = this.LOA - this.Ls - this.Lb;
  }

  GenralHullformConstraints(): Vec {
    return [-this.LOA + this.Ls + this.Lb, this.WL - this.Dd];
  }

  // Section 2: the midship cross section (keel radius, the lower gunwale line at the deadrise, the chine radius,
  // the upper gunwale line to the deck)

  /** The keel radius, the lower and upper gunwale lines and the chine radius of a section (midship or transom). */
  private section(Rk: number, keelZ: number, beta: number, Bc: number, Bd: number, Dd: number, Rc: number) {
    const Rk_Center = [-Rk * (0.5 - 0.5 * sign(Rk)), keelZ + Rk * (0.5 + 0.5 * sign(Rk))];
    const Rk_LG_int = [Rk_Center[0] + Rk * Math.sin((Math.PI * beta) / 180), Rk_Center[1] - Rk * Math.cos((Math.PI * beta) / 180)];
    const LG = solve(
      [
        [1, 1, 1],
        [Rk_LG_int[1], Rk_LG_int[0], 1],
        [-(Rk_LG_int[0] - Rk_Center[0]), Rk_LG_int[1] - Rk_Center[1], 0],
      ],
      [1, 0, 0],
    );
    const Dc = -(LG[1] * Bc + LG[2]) / LG[0];
    const UG = solve(
      [
        [Dc, Bc, 1],
        [Dd, Bd, 1],
        [1, 1, 1],
      ],
      [0, 0, 1],
    );
    const A1 = UG[0];
    const B1 = UG[1];
    let theta = Math.atan2(-B1, A1);
    if (theta < 0) theta += Math.PI;
    const b = (beta * Math.PI) / 180;
    const A2 = LG[0];
    const B2 = LG[1];
    const C = solve(
      [
        [B1, A1, 0, 0, 0, 0],
        [0, 0, B2, A2, 0, 0],
        [1, 0, 0, 0, -1, 0],
        [0, -1, 0, 0, 0, 1],
        [0, 0, 1, 0, -1, 0],
        [0, 0, 0, -1, 0, 1],
      ],
      [-UG[2], -LG[2], Rc * Math.sin(theta), Rc * Math.cos(theta), Rc * Math.sin(b), Rc * Math.cos(b)],
    );
    return { Rk_Center, Rk_LG_int, LG, Dc, UG, Rc_UG_int: C.slice(0, 2), Rc_LG_int: C.slice(2, 4), Rc_Center: C.slice(4, 6) };
  }

  GenCrossSection(): void {
    const s = this.section(this.Rk, 0, this.Beta, this.Bc, this.Bd, this.Dd, this.Rc);
    Object.assign(this, s);
  }

  CrossSectionConstraints(): Vec {
    return [
      -this.Rc_UG_int[1] + this.Dc,
      -this.Rc,
      -this.Bc,
      -this.Dc,
      this.Rc_LG_int[0] - this.Bc,
      this.Rk_LG_int[0] - this.Rc_LG_int[0],
      0.00000001 - Math.abs(this.Rk),
    ];
  }

  halfBeam_MidBody(z: number): number {
    if (z < 0 || z > this.Dd) return -1;
    if (z < this.Rk_LG_int[1]) return sign(this.Rk) * root(this.Rk ** 2 - (z - this.Rk_Center[1]) ** 2) + this.Rk_Center[0];
    if (z < this.Rc_LG_int[1]) return -(this.LG[0] * z + this.LG[2]) / this.LG[1];
    if (z < this.Rc_UG_int[1]) return root(this.Rc ** 2 - (z - this.Rc_Center[1]) ** 2) + this.Rc_Center[0];
    return -(this.UG[0] * z + this.UG[2]) / this.UG[1];
  }

  // Section 3: the bow form

  GenBowForm(): void {
    let Zv = this.BOW[0] === 0 ? -1 : -this.BOW[1] / (2 * this.BOW[0]);
    let C = [
      this.BOW[0] * this.Dd ** 2 + this.BOW[1] * this.Dd,
      this.BOW[0] * this.BK[1] ** 2 + this.BOW[1] * this.BK[1],
      this.BOW[0] * Zv ** 2 + this.BOW[1] * Zv,
    ];
    this.BOW[2] = Zv >= this.BK[1] * this.Dd && Zv <= this.Dd ? -Math.min(...C) : -Math.min(C[0], C[1]);
    this.BK[0] = this.bowrise(this.BK[1]);
    this.KEEL_BOW = this.BK[1] / (this.BK[0] - this.Kappa_BOW * this.Lb) ** 2;
    Zv = this.DELTA_BOW[0] === 0 ? -1 : -this.DELTA_BOW[1] / (2 * this.DELTA_BOW[0]);
    C = [this.DELTA_BOW[0] * this.Dd ** 2 + this.DELTA_BOW[1] * this.Dd, 0, this.DELTA_BOW[0] * Zv ** 2 + this.DELTA_BOW[1] * Zv];
    this.DELTA_BOW[2] = Zv >= 0 && Zv <= this.Dd ? -Math.max(...C) : -Math.max(C[0], C[1]);
  }

  bowrise(z: number): number {
    return this.BOW[0] * z ** 2 + this.BOW[1] * z + this.BOW[2];
  }

  keelrise_bow(z: number): number {
    return -Math.sqrt(z / this.KEEL_BOW) + this.Kappa_BOW * this.Lb;
  }

  delta_bow(z: number): number {
    return this.Lb + this.DELTA_BOW[0] * z ** 2 + this.DELTA_BOW[1] * z + this.DELTA_BOW[2];
  }

  drift(z: number): number {
    return (Math.PI * (this.DRIFT[0] * z ** 2 + this.DRIFT[1] * z + this.DRIFT[2])) / 180;
  }

  solve_waterline_bow(z: number): Vec {
    const X1 = this.bow_profile(z);
    const X2 = this.delta_bow(z);
    const Y2 = this.halfBeam_MidBody(z);
    return solve(
      [
        [X1 ** 3, X1 ** 2, X1, 1],
        [3 * X1 ** 2, 2 * X1, 1, 0],
        [X2 ** 3, X2 ** 2, X2, 1],
        [3 * X2 ** 2, 2 * X2, 1, 0],
      ],
      [0, Math.tan(this.drift(z)), Y2, 0],
    );
  }

  bow_profile(z: number): number {
    return z <= this.BK[1] ? this.keelrise_bow(z) : this.bowrise(z);
  }

  halfBeam_Bow(x: number, P: Vec): number {
    return P[0] * x ** 3 + P[1] * x ** 2 + P[2] * x + P[3];
  }

  bow_dydx(x: number, P: Vec): number {
    return 3 * P[0] * x ** 2 + 2 * P[1] * x + P[2];
  }

  BowformConstraints(): Vec {
    let Zv = this.DRIFT[0] === 0 ? -1 : -this.DRIFT[1] / (2 * this.DRIFT[0]);
    const vert_drift = Zv >= 0 && Zv <= this.Dd ? [this.drift(Zv) - Math.PI / 2, -this.drift(Zv)] : [-1, -1];
    Zv = this.DELTA_BOW[0] === 0 ? -1 : -this.DELTA_BOW[1] / (2 * this.DELTA_BOW[0]);
    const vert_delta_bow = Zv >= 0 && Zv <= this.Dd ? -this.delta_bow(Zv) + this.bow_profile(Zv) : -1;
    Zv = this.BOW[0] === 0 ? -1 : -this.BOW[1] / (2 * this.BOW[0]);
    const vert_bow = Zv >= 0 && Zv <= this.Dd ? -this.delta_bow(Zv) + this.bow_profile(Zv) : -1;
    return [
      this.Kappa_BOW * this.Lb - this.delta_bow(0),
      this.drift(0) - Math.PI / 2,
      -this.drift(0),
      this.drift(this.Dd) - Math.PI / 2,
      -this.drift(this.Dd),
      vert_drift[0],
      vert_drift[1],
      -this.BK[0],
      this.BK[0] - this.Kappa_BOW * this.Lb,
      -this.BK[1],
      this.BK[1] - this.Dd,
      -this.delta_bow(this.Dd) + this.bow_profile(this.Dd),
      -this.delta_bow(this.BK[1]) + this.BK[0],
      vert_delta_bow,
      vert_bow,
    ];
  }

  // Section 4: the stern form

  GenSternForm(): void {
    this.SK[1] = this.SK[1] * this.Dd;
    this.TRANS[1] = this.TRANS[0] >= 0 ? this.LOA - this.TRANS[0] * this.Dd : this.LOA - this.TRANS[0] * this.SK[1];
    this.SK[0] = this.transom(this.SK[1]);
    this.STERNRISE = this.SK[1] / (this.SK[0] - (this.Lb + this.Lm + this.Ls * this.Kappa_STERN)) ** 2;
    const Zv = this.DELTA_STERN[0] === 0 ? -1 : -this.DELTA_STERN[1] / (2 * this.DELTA_STERN[0]);
    const C = [this.DELTA_STERN[0] * this.Dd ** 2 + this.DELTA_STERN[1] * this.Dd, 0, this.DELTA_STERN[0] * Zv ** 2 + this.DELTA_STERN[1] * Zv];
    this.DELTA_STERN[2] = Zv >= 0 && Zv <= this.Dd ? -Math.min(...C) : -Math.min(C[0], C[1]);
    const s = this.section(this.Rk_trans, this.SK[1], this.Beta_trans, this.Bc_trans, this.Bs, this.Dd, this.Rc_trans);
    this.Rk_Center_trans = s.Rk_Center;
    this.Rk_LG_int_trans = s.Rk_LG_int;
    this.LG_trans = s.LG;
    this.Dc_trans = s.Dc;
    this.UG_trans = s.UG;
    this.Rc_UG_int_trans = s.Rc_UG_int;
    this.Rc_LG_int_trans = s.Rc_LG_int;
    this.Rc_Center_trans = s.Rc_Center;
  }

  transom(z: number): number {
    return this.TRANS[0] * z + this.TRANS[1];
  }

  sternrise(z: number): number {
    return Math.sqrt(z / this.STERNRISE) + this.Lb + this.Lm + this.Ls * this.Kappa_STERN;
  }

  stern_profile(z: number): number {
    if (this.bit_SB && z <= this.WL * this.HSBOA) return this.SB_Prof[0];
    return z <= this.SK[1] ? this.sternrise(z) : this.transom(z);
  }

  delta_stern(z: number): number {
    return this.Lb + this.Lm + this.DELTA_STERN[0] * z ** 2 + this.DELTA_STERN[1] * z + this.DELTA_STERN[2];
  }

  halfBeam_Transom(z: number): [number, number] {
    const x = this.stern_profile(z);
    let y: number;
    if (z <= this.SK[1] && z > 0) y = 0;
    else if (z < 0 || z > this.Dd) y = -1;
    else if (z > this.SK[1] && z < this.Rk_LG_int_trans[1]) y = sign(this.Rk_trans) * root(this.Rk_trans ** 2 - (z - this.Rk_Center_trans[1]) ** 2) + this.Rk_Center_trans[0];
    else if (z >= this.Rk_LG_int_trans[1] && z < this.Rc_LG_int_trans[1]) y = -(this.LG_trans[0] * z + this.LG_trans[2]) / this.LG_trans[1];
    else if (z >= this.Rc_LG_int_trans[1] && z < this.Rc_UG_int_trans[1]) y = root(this.Rc_trans ** 2 - (z - this.Rc_Center_trans[1]) ** 2) + this.Rc_Center_trans[0];
    else y = -(this.UG_trans[0] * z + this.UG_trans[2]) / this.UG_trans[1];
    return [x, y];
  }

  halfBeam_Stern(x: number, P: Vec): number {
    if (P[0]) return Math.sqrt(Math.abs(P[5] ** 2 * (1 - ((x - P[6]) / P[4]) ** 2))) + P[7];
    return P[1] * x ** 2 + P[2] * x + P[3];
  }

  stern_dydx(x: number, P: Vec): number {
    if (P[0]) return ((-P[5] * (x - P[6])) / P[4] ** 2) * (1 / Math.sqrt(Math.abs(1 - ((x - P[6]) / P[4]) ** 2)));
    return 2 * P[1] * x + P[2];
  }

  solve_waterline_stern(z: number): Vec {
    const x1 = this.delta_stern(z);
    const y1 = this.halfBeam_MidBody(z);
    const [x2, y2] = this.halfBeam_Transom(z);
    const P = new Array<number>(8).fill(0);
    const ellipse = z >= this.SK[1] ? this.bit_EP_T : this.bit_EP_S;
    if (ellipse) {
      P[0] = 1;
      P[4] = x2 - x1;
      P[5] = y1 - y2;
      P[6] = x1;
      P[7] = y2;
    } else {
      const C = solve(
        [
          [x1 ** 2, x1, 1],
          [x2 ** 2, x2, 1],
          [2 * x1, 1, 0],
        ],
        [y1, y2, 0],
      );
      P[1] = C[0];
      P[2] = C[1];
      P[3] = C[2];
    }
    return P;
  }

  SternformConstraints(): Vec {
    const Zv = this.DELTA_STERN[0] === 0 ? -1 : -this.DELTA_STERN[1] / (2 * this.DELTA_STERN[0]);
    const vert_delta_stern = Zv >= 0 && Zv <= this.Dd ? this.delta_stern(Zv) - this.stern_profile(Zv) : -1;
    return [
      this.delta_stern(0) - (this.Lb + this.Lm + this.Ls * this.Kappa_STERN),
      this.delta_stern(this.SK[1]) - this.SK[0],
      vert_delta_stern,
      this.delta_stern(this.Dd) - this.stern_profile(this.Dd),
      this.Lb + this.Lm + this.Ls * this.Kappa_STERN - this.SK[0],
      this.Bc_trans - this.halfBeam_MidBody(this.Dc_trans),
      -this.Rc_UG_int_trans[1] + this.Dc_trans,
      -this.Rc_trans,
      -this.Bc_trans,
      -this.Dc_trans,
      this.Rc_LG_int_trans[0] - this.Bc_trans,
      this.Rk_LG_int_trans[0] - this.Rc_LG_int_trans[0],
    ];
  }

  // Section 5: the bulbous bow and stern

  GenBulbForms(): void {
    if (this.bit_BB) {
      const FP = this.bow_profile(this.WL);
      this.BB_Prof = [
        FP,
        (1 - this.Hbb) * this.WL,
        this.Hbb * this.WL,
        this.halfBeam_MidBody(this.Hbb * this.WL) * this.Bbb,
        this.Lbb * this.LOA * (1 - this.Lbbm),
        FP - this.LOA * this.Lbb * this.Lbbm,
        0,
      ];
    }
    if (this.bit_SB) {
      const SBs = this.Kappa_SB * this.Ls + this.Lm + this.Lb;
      this.SB_Prof = [
        SBs,
        (1 - this.Hsb) * this.WL * this.HSBOA,
        this.Hsb * this.WL * this.HSBOA,
        this.halfBeam_MidBody(this.Hsb * this.WL * this.HSBOA) * this.Bsb,
        this.Lsb * this.LOA * (1 - this.Lsbm),
        SBs + this.LOA * this.Lsb * this.Lsbm,
        0,
      ];
    }
  }

  BB_profile(z: number): number {
    const Rz = z >= this.BB_Prof[2] ? this.BB_Prof[1] : this.BB_Prof[2];
    return this.BB_Prof[5] - Math.sqrt(Math.abs(1 - ((z - this.Hbb * this.WL) / Rz) ** 2)) * this.BB_Prof[4];
  }

  halfBeam_BB(z: number, x: number): number {
    const Rz = z >= this.BB_Prof[2] ? this.BB_Prof[1] : this.BB_Prof[2];
    const Ry = Math.sqrt(Math.abs(1 - ((z - this.BB_Prof[2]) / Rz) ** 2)) * this.BB_Prof[3];
    const Rx = this.BB_Prof[5] - this.BB_profile(z);
    if (x >= this.BB_Prof[5]) return Ry;
    return Math.sqrt(Math.abs(1 - ((x - this.BB_Prof[5]) / Rx) ** 2)) * Ry;
  }

  BB_dydx(z: number, x: number): number {
    const Rz = z >= this.BB_Prof[2] ? this.BB_Prof[1] : this.BB_Prof[2];
    const Ry = Math.sqrt(Math.abs(1 - ((z - this.BB_Prof[2]) / Rz) ** 2)) * this.BB_Prof[3];
    const Rx = this.BB_Prof[5] - this.BB_profile(z);
    if (x >= this.BB_Prof[5]) return 0;
    return ((-Ry * (x - this.BB_Prof[5])) / Rx ** 2) * (1 / Math.sqrt(Math.abs(1 - ((x - this.BB_Prof[5]) / Rx) ** 2)));
  }

  SB_profile(z: number): number {
    const Rz = z >= this.Hsb * this.WL * this.HSBOA ? this.SB_Prof[1] : this.SB_Prof[2];
    return this.SB_Prof[5] + Math.sqrt(Math.abs(1 - ((z - this.Hsb * this.WL * this.HSBOA) / Rz) ** 2)) * this.SB_Prof[4];
  }

  halfBeam_SB(z: number, x: number): number {
    const Rz = z >= this.Hsb * this.WL * this.HSBOA ? this.SB_Prof[1] : this.SB_Prof[2];
    const Ry = Math.sqrt(Math.abs(1 - ((z - this.Hsb * this.WL * this.HSBOA) / Rz) ** 2)) * this.SB_Prof[3];
    const Rx = this.SB_profile(z) - this.SB_Prof[5];
    if (x <= this.SB_Prof[5]) return Ry;
    return Math.sqrt(Math.abs(1 - ((x - this.SB_Prof[5]) / Rx) ** 2)) * Ry;
  }

  SB_dydx(z: number, x: number): number {
    const Rz = z >= this.Hsb * this.WL * this.HSBOA ? this.SB_Prof[1] : this.SB_Prof[2];
    const Ry = Math.sqrt(Math.abs(1 - ((z - this.Hsb * this.WL * this.HSBOA) / Rz) ** 2)) * this.SB_Prof[3];
    const Rx = this.SB_profile(z) - this.SB_Prof[5];
    if (x <= this.SB_Prof[5]) return 0;
    return ((-Ry * (x - this.SB_Prof[5])) / Rx ** 2) * (1 / Math.sqrt(Math.abs(1 - ((x - this.SB_Prof[5]) / Rx) ** 2)));
  }

  BulbformConstraints(): Vec {
    const C = new Array<number>(13).fill(0);
    if (this.bit_BB) {
      const third = this.BB_Prof[3] - this.halfBeam_MidBody(this.BB_Prof[2]);
      if (this.Beta === 0) C.splice(0, 3, -1, -1, third);
      else if (this.Rk > 0) C.splice(0, 3, this.BB_Prof[2] - this.Rk, this.BB_Prof[3] - this.Rk, third);
      else C.splice(0, 3, 1, 1, 1);
      const Zv = this.DELTA_BOW[0] === 0 ? -1 : -this.DELTA_BOW[1] / (2 * this.DELTA_BOW[0]);
      const vert = Zv >= 0 && Zv <= this.WL ? this.delta_bow(Zv) - this.BB_Prof[5] : -1;
      C.splice(3, 3, this.BB_Prof[5] - this.delta_bow(0), this.BB_Prof[5] - this.delta_bow(this.WL), vert);
    } else C.splice(0, 6, -1, -1, -1, -1, -1, -1);
    if (this.bit_SB) {
      const third = this.SB_Prof[3] - this.halfBeam_MidBody(this.SB_Prof[2]);
      const fourth = this.WL * this.HSBOA - this.SK[1];
      if (this.Beta === 0) C.splice(6, 4, -1, -1, third, fourth);
      else if (this.Rk > 0) C.splice(6, 4, this.SB_Prof[2] - this.Rk, this.SB_Prof[3] - this.Rk, third, fourth);
      else C.splice(6, 4, 1, 1, 1, 1);
      const Zv = this.DELTA_STERN[0] === 0 ? -1 : -this.DELTA_STERN[1] / (2 * this.DELTA_STERN[0]);
      const vert = Zv >= 0 && Zv <= this.WL * this.HSBOA ? this.delta_stern(Zv) - this.SB_Prof[5] : -1;
      C.splice(10, 3, this.delta_stern(0) - this.SB_Prof[5], this.delta_stern(this.WL * this.HSBOA) - this.SB_Prof[5], vert);
    } else C.splice(6, 7, -1, -1, -1, -1, -1, -1, -1);
    return C;
  }

  /** All 49 constraint values: the hull is feasible when every one is at most 0. */
  input_Constraints(): Vec {
    return [...this.GenralHullformConstraints(), ...this.CrossSectionConstraints(), ...this.BowformConstraints(), ...this.SternformConstraints(), ...this.BulbformConstraints()];
  }

  // The waterlines: what gen_WLPoints samples, as a half-breadth function of x at each height

  /** Where the waterline at height z starts at the bow and ends at the stern. */
  waterlineRange(z: number): [number, number] {
    const start = this.bit_BB && z < this.WL ? this.BB_profile(z) : this.bow_profile(z);
    const end = this.bit_SB && z < this.WL * this.HSBOA ? this.SB_profile(z) : this.stern_profile(z);
    return [start, end];
  }

  /** The waterline at height z (0 < z ≤ Dd) as a half-breadth function of x, null outside it. */
  waterline(z: number): (x: number) => number | null {
    const [x0, x1] = this.waterlineRange(z);
    const db = this.delta_bow(z);
    const ds = this.delta_stern(z);
    const mid = this.halfBeam_MidBody(z);
    const bow = this.bowWaterline(z, x0);
    const stern = this.sternWaterline(z, x1);
    return (x) => {
      if (x < x0 - 1e-12 || x > x1 + 1e-12) return null;
      if (x <= x0) return 0;
      if (x <= db) return bow(x);
      if (x < ds) return mid;
      return stern(x);
    };
  }

  /** gen_waterline_bow and gen_waterline_bow_BB: the bow taper from its leading edge to delta_bow(z). */
  private bowWaterline(z: number, x1: number): (x: number) => number {
    const PROF = this.solve_waterline_bow(z);
    if (!this.bit_BB || z >= this.WL) return (x) => this.halfBeam_Bow(x, PROF);
    // where the bulb meets the bow curve, and the quartic fillet either side of it
    const A = [...PROF];
    A[3] = A[3] - this.halfBeam_BB(z, this.BB_Prof[5]);
    const lo = Math.max(this.bow_profile(z), this.BB_profile(z));
    const candidates = roots(A).filter((r) => geq(r, this.bow_profile(z)) && geq(r, this.BB_profile(z)));
    const x_int = candidates.length ? Math.min(...candidates.map((r) => r[0])) : Infinity;
    if (!this.bowFilletHolds(z, x_int)) {
      // A departure from the original: just below the waterline, where the bulb thins to nothing, the root it takes
      // as the bulb meeting the bow can lie aft of the whole bow taper, and the waterline then pinches to the
      // bulb's width all the way to delta_bow(z). There the bulb and the bow are taken as one: the wider of the two.
      const bulbEnd = this.BB_Prof[5];
      return (x) => {
        if (x <= x1) return 0;
        const bulb = x <= bulbEnd || x <= lo ? this.halfBeam_BB(z, x) : 0;
        const bow = x >= this.bow_profile(z) ? this.halfBeam_Bow(x, PROF) : 0;
        return Math.max(bulb, bow);
      };
    }
    const dx = Math.abs(Math.min(x_int - this.BB_profile(z), this.delta_bow(z) - x_int));
    const Xrad = [x_int - (dx * this.Rbb) / 2, x_int + (dx * this.Rbb) / 2];
    const Yrad = [this.halfBeam_BB(z, Xrad[0]), this.halfBeam_Bow(Xrad[1], PROF)];
    const dydx = [this.BB_dydx(z, Xrad[0]), this.bow_dydx(Xrad[1], PROF)];
    // the original's fifth condition, as written (6·x0², not 6·x0)
    const R = solve(
      [
        [Xrad[0] ** 4, Xrad[0] ** 3, Xrad[0] ** 2, Xrad[0], 1],
        [Xrad[1] ** 4, Xrad[1] ** 3, Xrad[1] ** 2, Xrad[1], 1],
        [4 * Xrad[0] ** 3, 3 * Xrad[0] ** 2, 2 * Xrad[0], 1, 0],
        [4 * Xrad[1] ** 3, 3 * Xrad[1] ** 2, 2 * Xrad[1], 1, 0],
        [12 * Xrad[0] ** 2, 6 * Xrad[0] ** 2, 2, 0, 0],
      ],
      [Yrad[0], Yrad[1], dydx[0], dydx[1], 0],
    );
    return (x) => {
      if (x <= x1) return 0;
      if (x <= Xrad[0]) return this.halfBeam_BB(z, x);
      if (x < Xrad[1]) return R[0] * x ** 4 + R[1] * x ** 3 + R[2] * x ** 2 + R[3] * x + R[4];
      return this.halfBeam_Bow(x, PROF);
    };
  }

  /** Whether the original's fillet between the bulbous bow and the bow holds at height z (see bowWaterline). */
  bowFilletHolds(z: number, x_int?: number): boolean {
    if (!this.bit_BB || z >= this.WL) return true;
    if (x_int === undefined) {
      const A = [...this.solve_waterline_bow(z)];
      A[3] = A[3] - this.halfBeam_BB(z, this.BB_Prof[5]);
      const c = roots(A).filter((r) => geq(r, this.bow_profile(z)) && geq(r, this.BB_profile(z)));
      x_int = c.length ? Math.min(...c.map((r) => r[0])) : Infinity;
    }
    return x_int < this.delta_bow(z);
  }

  /** gen_waterline_stern and gen_waterline_stern_SB: the stern taper from delta_stern(z) to the stern. */
  private sternWaterline(z: number, x2: number): (x: number) => number {
    const PROF = this.solve_waterline_stern(z);
    if (!this.bit_SB || z >= this.WL * this.HSBOA) {
      const transom = this.halfBeam_Transom(z)[1];
      return (x) => (x >= x2 ? transom : this.halfBeam_Stern(x, PROF));
    }
    let y_int = this.halfBeam_SB(z, this.SB_Prof[5]);
    let x_int: number;
    const atStart = this.halfBeam_Stern(this.delta_stern(z), PROF);
    if (y_int >= atStart) {
      y_int = atStart;
      x_int = this.SB_Prof[0];
    } else if (PROF[0]) {
      x_int = PROF[4] * Math.sqrt(Math.abs(1 - ((y_int - PROF[7]) / PROF[5]) ** 2)) + PROF[6];
    } else {
      const candidates = roots([PROF[1], PROF[2], PROF[3] - y_int]).filter((r) => geq(r, this.delta_stern(z)));
      if (!candidates.length) throw new Error(`no intersection of the bulbous stern with the stern at z = ${z}`);
      x_int = Math.max(...candidates.map((r) => r[0]));
    }
    const dx = Math.abs(Math.min(x_int - this.delta_stern(z), this.SB_profile(z) - x_int));
    const Xrad = [x_int - (dx * this.Rsb) / 2, x_int + (dx * this.Rsb) / 2];
    const Yrad = [this.halfBeam_Stern(Xrad[0], PROF), this.halfBeam_SB(z, Xrad[1])];
    const dydx = [this.stern_dydx(Xrad[0], PROF), this.SB_dydx(z, Xrad[1])];
    // the original's fifth condition, as written (at Xrad[1], 6·x1²)
    const R = solve(
      [
        [Xrad[0] ** 4, Xrad[0] ** 3, Xrad[0] ** 2, Xrad[0], 1],
        [Xrad[1] ** 4, Xrad[1] ** 3, Xrad[1] ** 2, Xrad[1], 1],
        [4 * Xrad[0] ** 3, 3 * Xrad[0] ** 2, 2 * Xrad[0], 1, 0],
        [4 * Xrad[1] ** 3, 3 * Xrad[1] ** 2, 2 * Xrad[1], 1, 0],
        [12 * Xrad[1] ** 2, 6 * Xrad[1] ** 2, 2, 0, 0],
      ],
      [Yrad[0], Yrad[1], dydx[0], dydx[1], 0],
    );
    return (x) => {
      if (x >= x2) return 0;
      if (x <= Xrad[0]) return this.halfBeam_Stern(x, PROF);
      if (x < Xrad[1]) return R[0] * x ** 4 + R[1] * x ** 3 + R[2] * x ** 2 + R[3] * x + R[4];
      return this.halfBeam_SB(z, x);
    };
  }
}

/** The 49 constraint values for a vector (feasible when all are at most 0), or null if it cannot be built at all. */
export function shipdConstraints(vector: readonly number[]): number[] | null {
  try {
    return new ShipD(vector).input_Constraints();
  } catch {
    return null;
  }
}

/**
 * Whether a vector describes a buildable, feasible hull: every constraint at most 0, give or take rounding (a hull
 * exactly on a limit, say a chine radius that meets the deck line, comes out a few parts in 10¹⁶ either side).
 */
export function shipdFeasible(vector: readonly number[]): boolean {
  const c = shipdConstraints(vector);
  const eps = 1e-12 * Math.max(1, Math.abs(vector[0]));
  return !!c && c.every((v) => Number.isFinite(v) && v <= eps);
}

export interface ShipDBodyOptions {
  /** The body's centre line across the boat (m), for a multihull. */
  center?: number;
  /** Where the body's stern sits along the length (m), for a multihull's outer hulls. */
  aft?: number;
  /** Stations along the length and heights between the keel and the deck. */
  stations?: number;
  levels?: number;
}

/**
 * A Ship-D vector as a hull body. vector[0] is the length overall in metres (the dataset's hulls use 10); every
 * other dimension is a share of it, so changing it scales the hull. Throws for a vector the parameterisation
 * cannot build; check shipdFeasible first.
 */
export function shipdBody(vector: readonly number[], options: ShipDBodyOptions = {}): HullBody {
  const h = new ShipD(vector);
  const center = options.center ?? 0;
  const aft = options.aft ?? 0;
  const nStations = Math.max(3, Math.round(options.stations ?? 121));
  const nLevels = Math.max(4, Math.round(options.levels ?? 60));
  const tiny = 1e-5 * h.Dd;
  // the heights: closer together towards the keel (where a keel radius turns fastest), plus every height a form
  // changes at: the knuckles of the midship and transom sections, the bow and stern knuckles, the waterline, bulbs
  // a bulb's top and the transom's foot are steps in height: a waterline just under one is a different shape from
  // one just over it, so both are sampled, a hair either side
  const hair = 1e-6 * h.Dd;
  const steps = [h.SK[1], ...(h.bit_BB ? [h.WL] : []), ...(h.bit_SB ? [h.HSBOA * h.WL] : [])].flatMap((z) => [z - hair, z + hair]);
  const special = [
    h.BK[1], h.SK[1], h.WL, h.Hbb * h.WL, h.HSBOA * h.WL, h.Hsb * h.WL * h.HSBOA, h.Rk_LG_int[1], h.Rc_LG_int[1],
    h.Rc_UG_int[1], h.Rk_LG_int_trans[1], h.Rc_LG_int_trans[1], h.Rc_UG_int_trans[1], ...steps,
  ].filter((z) => Number.isFinite(z) && z > tiny && z < h.Dd);
  const graded = Array.from({ length: nLevels }, (_, i) => tiny + (h.Dd - tiny) * (i / (nLevels - 1)) ** 1.6);
  // exact heights, never rounded: a waterline a hair below WL is a different waterline (the bulb is still there)
  const sorted = [...special, ...graded].sort((a, b) => a - b);
  const zs = sorted.filter((z, i) => i === 0 || z - sorted[i - 1] > 1e-9 * h.Dd);
  const lines = zs.map((z) => ({ z, half: h.waterline(z), range: h.waterlineRange(z) }));
  // the length the hull spans at any height (a bulb can reach forward of the bow at the deck, or aft of the transom)
  const xs0 = Math.min(...lines.map((l) => l.range[0]));
  const xs1 = Math.max(...lines.map((l) => l.range[1]));
  // stations: an even spread, plus a station wherever a waterline begins or ends, so the stem, the transom and a
  // bulb's end are each met by a station instead of being bridged between two
  const spacing = (xs1 - xs0) / (nStations - 1);
  const xsAll = [
    ...Array.from({ length: nStations }, (_, i) => xs0 + spacing * i),
    ...lines.flatMap((l) => l.range),
  ].sort((a, b) => a - b);
  const stationXs = xsAll.filter((x, i) => i === 0 || x - xsAll[i - 1] > spacing / 50);
  const covers = (z: number, xs: number) => {
    const [a, b] = h.waterlineRange(z);
    return xs >= a - 1e-12 && xs <= b + 1e-12;
  };
  const edge = (xs: number, inside: number, outside: number) => {
    for (let i = 0; i < 50; i++) {
      const mid = (inside + outside) / 2;
      if (covers(mid, xs)) inside = mid;
      else outside = mid;
    }
    return inside;
  };
  /** The section at the original's x (in our x from the stern), or null where no waterline reaches. */
  const sectionAtXs = (xs: number): Section | null => {
    const halves = lines.map((l) => l.half(xs));
    const k0 = halves.findIndex((v) => v !== null);
    if (k0 < 0) return null;
    let k1 = halves.length - 1;
    while (halves[k1] === null) k1--;
    const points: SectionPoint[] = [];
    const push = (z: number, half: number) => points.push([z - h.WL, Math.max(0, half)]);
    if (k0 > 0) {
      const zb = edge(xs, zs[k0], zs[k0 - 1]);
      push(zb, h.waterline(zb)(xs) ?? 0);
    }
    for (let k = k0; k <= k1; k++) push(zs[k], halves[k] ?? 0);
    if (k1 < zs.length - 1) {
      const zt = edge(xs, zs[k1], zs[k1 + 1]);
      push(zt, h.waterline(zt)(xs) ?? 0);
    }
    if (points.length < 2) points.push([points[0][0], points[0][1]]);
    return { x: h.LOA - xs, points };
  };
  // Between two stations the shape is interpolated by the share of each section's height, which is exact for a
  // smooth hull but not across a knuckle that sits at a different share of each (a transom's lower edge, a chine
  // meeting a rising keel). So each interval is checked against the waterlines themselves at its middle, and split
  // where the interpolation is off by more than a small share of the half-beam. A split only goes on while it
  // pays: a smooth shape's error falls about fourfold each time the interval is halved, but across a step in the
  // shape (a raked transom's edge crossing the stations) it does not fall at all, and splitting further there only
  // multiplies stations without making the hull any truer.
  const tol = 0.005 * Math.max(...lines.map((l) => (l.range[0] + l.range[1]) / 2).map((xm, k) => lines[k].half(xm) ?? 0));
  const stations = stationXs.map((xs) => ({ xs, s: sectionAtXs(xs) })).filter((st): st is { xs: number; s: Section } => !!st.s);
  const error = (a: { xs: number; s: Section }, b: { xs: number; s: Section }, xm: number): number => {
    const pair: HullBody = { center: 0, sections: [b.s, a.s] };
    let worst = 0;
    for (const l of lines) {
      const direct = l.half(xm);
      const between = halfAt(pair, h.LOA - xm, l.z - h.WL);
      worst = Math.max(worst, direct === null || between === null ? Math.max(direct ?? 0, between ?? 0) : Math.abs(direct - between));
    }
    return worst;
  };
  const refined: { xs: number; s: Section }[] = [stations[0]];
  const split = (a: { xs: number; s: Section }, b: { xs: number; s: Section }, depth: number, before: number) => {
    const xm = (a.xs + b.xs) / 2;
    const s = depth < 6 ? sectionAtXs(xm) : null;
    const err = s ? error(a, b, xm) : 0;
    // the first three halvings always go ahead: a narrow feature (a bulb's neck) is only seen once a station is near it
    if (s && err > tol && (depth < 3 || err < 0.75 * before)) {
      const m = { xs: xm, s };
      split(a, m, depth + 1, err);
      split(m, b, depth + 1, err);
    } else refined.push(b);
  };
  for (let i = 1; i < stations.length; i++) split(stations[i - 1], stations[i], 0, Infinity);
  // stations from the stern (the original's largest x) forward, in our x from the stern
  const sections = refined.reverse().map(({ s }) => ({ x: aft + s.x, points: s.points }));
  return { center, sections };
}
