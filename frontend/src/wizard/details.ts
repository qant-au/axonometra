// Axonometra: what the first-run wizard knows about a boat before there is a plan of her. A source reads it (a boat's
// own data server, later; for now the wizard's example readings, or nothing and the owner types it in), the owner
// checks it, and the wizard turns it into a plan. Measures in SI units, as a boat's data server gives them: metres,
// cubic metres, kilograms.

/** What a tank holds (the names a boat's data server uses for its tanks). */
export type TankFluid = "fuel" | "freshWater" | "wasteWater" | "blackWater" | "liveWell" | "lubrication" | "gas";

export interface TankDetails {
  /** The tank's key at its source, e.g. "fuel.main" (unique among the tanks). */
  id: string;
  fluid: TankFluid;
  /** Capacity (m³). */
  capacity?: number;
}

export interface EngineDetails {
  /** The engine's key at its source, e.g. "port" (unique among the engines). */
  id: string;
  kind?: "outboard" | "inboard" | "sterndrive";
  /** Rated power (W). */
  power?: number;
}

export interface BatteryDetails {
  /** The battery's key at its source, e.g. "house" (unique among the batteries). */
  id: string;
  /** Nominal capacity (Ah). */
  capacity?: number;
}

export interface VesselDetails {
  name?: string;
  mmsi?: string;
  /** Length overall (m). */
  length?: number;
  /** Greatest beam (m). */
  beam?: number;
  /** Greatest draft (m). */
  draft?: number;
  /** Height of the highest point above the waterline (m). */
  airHeight?: number;
  tanks: TankDetails[];
  engines: EngineDetails[];
  batteries: BatteryDetails[];
}

export function noDetails(): VesselDetails {
  return { tanks: [], engines: [], batteries: [] };
}

/**
 * Where the wizard reads a boat from. A boat's data server becomes one of these (read once, at the wizard's first
 * step); the wizard does not care where the details came from, only that the owner can check and change them.
 */
export interface VesselSource {
  id: string;
  /** Shown on the source step; the wizard's texts name the built-in ones. */
  label: string;
  /** Whether it can be read here and now (a server that is not connected says no, with a reason). */
  available(): Promise<{ ok: true } | { ok: false; reason: string }>;
  read(): Promise<VesselDetails>;
}

/**
 * Made-up readings for an open alloy boat with twin outboards, to try the wizard without a boat: no real boat's
 * name or number.
 */
export const EXAMPLE_DETAILS: VesselDetails = {
  name: "Example",
  mmsi: "000000000",
  length: 6.5,
  beam: 2.45,
  draft: 0.36,
  airHeight: 2.2,
  tanks: [{ id: "fuel.main", fluid: "fuel", capacity: 0.2 }],
  engines: [
    { id: "port", kind: "outboard", power: 110000 },
    { id: "starboard", kind: "outboard", power: 110000 },
  ],
  batteries: [{ id: "start", capacity: 100 }],
};

/** The example readings as a source. */
export const EXAMPLE_SOURCE: VesselSource = {
  id: "example",
  label: "Example readings",
  available: async () => ({ ok: true }),
  read: async () => structuredClone(EXAMPLE_DETAILS),
};

/** The sources the wizard offers; typing the details in is always there besides these. */
export const VESSEL_SOURCES: VesselSource[] = [EXAMPLE_SOURCE];
