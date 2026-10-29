// Loads the card's visual editor only when the dashboard opens it (it defines <axonometra-card-editor>).

/** Content hash of the card editor bundle, set by the build (see build.mjs). */
declare const __FP3D_CARD_EDITOR_HASH__: string;

let loading: Promise<unknown> | undefined;

export function loadCardEditor(): Promise<unknown> {
  const url = new URL(`./axonometra-card-editor.js?v=${__FP3D_CARD_EDITOR_HASH__}`, new URL(import.meta.url)).href;
  loading ??= import(/* @vite-ignore */ url);
  return loading;
}
