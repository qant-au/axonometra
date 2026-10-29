// Axonometra: the simplest signal source, a map of states the host sets. Signal K and simulators come later
// as their own sources behind the same interface (types.ts).

import type { HassEntity } from "../types.ts";
import type { SignalSource } from "./types.ts";

export interface StaticSignals extends SignalSource {
  /** Sets one signal's state (and attributes) and tells the engine. */
  set(id: string, state: string, attributes?: Record<string, unknown>): void;
}

export function staticSignals(initial: Record<string, { state: string; attributes?: Record<string, unknown> }> = {}): StaticSignals {
  let states: Record<string, HassEntity> = {};
  const listeners = new Set<() => void>();
  const entity = (id: string, state: string, attributes: Record<string, unknown> = {}): HassEntity => {
    const now = new Date().toISOString();
    return { entity_id: id, state, attributes, last_changed: now, last_updated: now };
  };
  for (const [id, s] of Object.entries(initial)) states[id] = entity(id, s.state, s.attributes);
  return {
    states: () => states,
    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    set(id, state, attributes) {
      states = { ...states, [id]: entity(id, state, attributes ?? states[id]?.attributes) };
      for (const cb of listeners) cb();
    },
  };
}
