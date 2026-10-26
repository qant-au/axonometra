// Accurona: the embedding API. mountAccurona() puts the planner (plan, editor, 3D view) into any page, with no
// Home Assistant anywhere: the plan comes from a store, live data from an optional signal source.
//
//   import { mountAccurona, browserStore } from "./accurona-host.js";
//   const planner = await mountAccurona(document.querySelector("#plan"), { store: browserStore("my-boat") });
//
// The engine's own bundles (accurona.js and the lazily loaded ones beside it) are loaded from `bundleUrl`,
// by default the folder this file is served from.

import { createHass } from "./hass.ts";
import type { HostOptions } from "./types.ts";

export { createHass } from "./hass.ts";
export { browserStore, memoryStore } from "./store.ts";
export { staticSignals } from "./signals.ts";
export type { HostOptions, PlanStore, SignalSource } from "./types.ts";

export interface MountOptions extends HostOptions {
  /** URL of the engine's main bundle (accurona.js). Default: beside this file. */
  bundleUrl?: string;
  /** Phone layout. Default: decided from the target's width. */
  narrow?: boolean;
}

export interface Planner {
  /** The <accurona-panel> element. */
  readonly element: HTMLElement;
  /** Removes the planner and stops following the signal source. */
  destroy(): void;
}

export async function mountAccurona(target: HTMLElement, options: MountOptions): Promise<Planner> {
  await import(/* @vite-ignore */ options.bundleUrl ?? new URL("./accurona.js", import.meta.url).href);
  const handle = await createHass(options);
  const element = document.createElement("accurona-panel") as HTMLElement & { hass: unknown; narrow: boolean };
  element.narrow = options.narrow ?? target.clientWidth < 700;
  element.hass = handle.hass;
  const stop = handle.onChange((hass) => (element.hass = hass));
  target.append(element);
  return {
    element,
    destroy() {
      stop();
      handle.dispose();
      element.remove();
    },
  };
}
