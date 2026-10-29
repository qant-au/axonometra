// Loads the three.js bundle only when a 3D view is opened.

import type * as Viewer from "./viewer/viewer3d.ts";

export type ViewerModule = typeof Viewer;

/** Content hash of the 3D bundle, set by the build (see build.mjs). */
declare const __FP3D_VIEWER_HASH__: string;

const base = new URL(import.meta.url);
const url = new URL(`./axonometra-3d.js?v=${__FP3D_VIEWER_HASH__}`, base).href;

let loading: Promise<ViewerModule> | undefined;

export function load3d(): Promise<ViewerModule> {
  loading ??= import(/* @vite-ignore */ url) as Promise<ViewerModule>;
  return loading;
}
