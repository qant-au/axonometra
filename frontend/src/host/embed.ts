// Axonometra: the embedding API. mountAxonometra() puts the planner (plan, editor, 3D view) into any page, with no
// Home Assistant anywhere: the plan comes from a store, live data from an optional signal source.
//
//   import { mountAxonometra, browserStore } from "./axonometra-host.js";
//   const planner = await mountAxonometra(document.querySelector("#plan"), { store: browserStore("my-boat") });
//
// The engine's own bundles (axonometra.js and the lazily loaded ones beside it) are loaded from `bundleUrl`,
// by default the folder this file is served from.

import { createHass } from "./hass.ts";
import type { HostOptions } from "./types.ts";

export { createHass } from "./hass.ts";
export { browserStore, memoryStore } from "./store.ts";
export { staticSignals } from "./signals.ts";
export type { HostOptions, PlanStore, SignalSource } from "./types.ts";

export interface MountOptions extends HostOptions {
  /** URL of the engine's main bundle (axonometra.js). Default: beside this file. */
  bundleUrl?: string;
  /** Phone layout. Default: decided from the target's width. */
  narrow?: boolean;
}

export interface Planner {
  /** The <axonometra-panel> element. */
  readonly element: HTMLElement;
  /** Removes the planner and stops following the signal source. */
  destroy(): void;
}

export async function mountAxonometra(target: HTMLElement, options: MountOptions): Promise<Planner> {
  await import(/* @vite-ignore */ options.bundleUrl ?? new URL("./axonometra.js", import.meta.url).href);
  const handle = await createHass(options);
  const element = document.createElement("axonometra-panel") as HTMLElement & { hass: unknown; narrow: boolean };
  element.narrow = options.narrow ?? target.clientWidth < 700;
  element.hass = handle.hass;
  const stop = handle.onChange((hass) => (element.hass = hass));
  // An embedded planner fills its target and keeps to it: the panel's own height is the viewport's (right for the
  // Home Assistant panel), and its overlays and the first-run wizard are position: fixed. Layout and paint
  // containment make the planner their containing block, so a second planner, or the rest of the page, is never
  // covered. A target with no height of its own keeps the viewport height, as before.
  element.style.height = "100%";
  element.style.contain = "layout paint";
  target.append(element);
  if (element.clientHeight < 1) element.style.removeProperty("height");
  return {
    element,
    destroy() {
      stop();
      handle.dispose();
      element.remove();
    },
  };
}
