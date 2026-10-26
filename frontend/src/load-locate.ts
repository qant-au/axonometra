// Locating setup: its bundle loads only when an admin opens it.

import type * as LocateBundle from "./locate/entry.ts";

/** Content hash of the locating bundle, set by the build (see build.mjs). */
declare const __FP3D_LOCATE_HASH__: string;

let loading: Promise<typeof LocateBundle> | undefined;

export function loadLocate(): Promise<typeof LocateBundle> {
  const url = new URL(`./accurona-locate.js?v=${__FP3D_LOCATE_HASH__}`, new URL(import.meta.url)).href;
  loading ??= (import(/* @vite-ignore */ url) as Promise<typeof LocateBundle>).catch((err) => {
    loading = undefined;
    throw err;
  });
  return loading;
}
