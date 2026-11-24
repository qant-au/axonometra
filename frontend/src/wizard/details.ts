// Axonometra: what is known about a boat before there is a plan of her: her measures and what she carries. The
// first-run wizard fills in the measures and the engines from its page of basics (flow.ts); a boat's own data server
// can give the rest later. Measures in SI units, as a boat's data server gives them: metres, cubic metres, kilograms.

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
 * Made-up readings for an open alloy boat with twin outboards, for the tests: no real boat's name or number.
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
