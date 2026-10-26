// Accurona: what a host gives the engine. Home Assistant is one host (the integration); the standalone
// host here is another, and a Signal K host will be a third. The engine itself only ever sees the
// HomeAssistant-shaped object that createHass() builds from these.

import type { Building } from "../model.ts";
import type { HassEntity } from "../types.ts";

/** Where the plan and its pictures live. */
export interface PlanStore {
  /** The saved plan and its revision, or null when nothing has been saved yet. */
  load(): Promise<{ building: Building; revision: number } | null>;
  save(building: Building, revision: number): Promise<void>;
  loadImage(id: string): Promise<string | null>;
  saveImage(id: string, data: string): Promise<void>;
}

/**
 * The outside world the plan reacts to: one state per signal, in Home Assistant's entity shape so the
 * engine's device bindings work unchanged. A Signal K source maps paths to signals; a simulator invents them.
 */
export interface SignalSource {
  /** The current states, keyed by signal id. */
  states(): Record<string, HassEntity>;
  /** Called after any state changes; returns the unsubscribe. */
  subscribe(listener: () => void): () => void;
  /** A command from the plan (a tap on a light, a slider). Absent: the source is read-only. */
  act?(domain: string, service: string, data: Record<string, unknown>): Promise<void>;
}

export interface HostOptions {
  store: PlanStore;
  /** Absent: a plan with no live data (pure planning). */
  signals?: SignalSource;
  /** BCP 47 language; the engine has de and en and falls back to en. Default: the browser's. */
  language?: string;
  /** Whether the viewer may open the editor. Default true. */
  admin?: boolean;
  /** For the sun and the time of day: the site's position. */
  location?: { latitude: number; longitude: number; timeZone?: string };
  /**
   * Whether the planner shows its Home Assistant-only parts (Assist, the room device panel, time travel, cameras,
   * weather, services, the energy dashboard, Home Assistant areas and devices). Default false: a host turns it on
   * only when it bridges to a Home Assistant.
   */
  homeAssistant?: boolean;
}
