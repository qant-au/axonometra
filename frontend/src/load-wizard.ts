// Accurona: the first-run wizard's bundle loads only when it opens (wizard/entry.ts), over a planner with an empty
// plan. Its button's label is here, so the main bundle needs nothing else of it.

import type * as WizardBundle from "./wizard/entry.ts";

/** Content hash of the wizard bundle, set by the build (see build.mjs). */
declare const __FP3D_WIZARD_HASH__: string;

let loading: Promise<typeof WizardBundle> | undefined;

export function loadWizard(): Promise<typeof WizardBundle> {
  const url = new URL(`./accurona-wizard.js?v=${__FP3D_WIZARD_HASH__}`, new URL(import.meta.url)).href;
  loading ??= (import(/* @vite-ignore */ url) as Promise<typeof WizardBundle>).catch((err) => {
    loading = undefined;
    throw err;
  });
  return loading;
}

/** The empty planner's button that opens the wizard. */
export function firstRunLabel(language: string | undefined): string {
  return (language ?? "en").toLowerCase().startsWith("de") ? "Boot oder Gebäude anlegen" : "Set up a boat or a building";
}
