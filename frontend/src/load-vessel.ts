// Accurona: the vessel bundle (the hull code) loads only when a plan is drawn in a vessel (vessel/spec.ts).

import type * as VesselBundle from "./vessel/entry.ts";

/** Content hash of the vessel bundle, set by the build (see build.mjs). */
declare const __FP3D_VESSEL_HASH__: string;

let loading: Promise<typeof VesselBundle> | undefined;

export function loadVessel(): Promise<typeof VesselBundle> {
  const url = new URL(`./accurona-vessel.js?v=${__FP3D_VESSEL_HASH__}`, new URL(import.meta.url)).href;
  loading ??= (import(/* @vite-ignore */ url) as Promise<typeof VesselBundle>).catch((err) => {
    loading = undefined;
    throw err;
  });
  return loading;
}
