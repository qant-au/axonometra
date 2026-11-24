// Axonometra: the first-run wizard's bundle loads only when it opens (wizard/entry.ts), over a planner with an empty
// plan. Its button's label and its questions to the host are here, so the main bundle needs nothing else of it.

import type { SavedPlan, SavedPlans } from "./host/types.ts";
import { normalizeBuilding, type Building } from "./model.ts";
import type { HomeAssistant } from "./types.ts";
import type * as WizardBundle from "./wizard/entry.ts";

/** Content hash of the wizard bundle, set by the build (see build.mjs). */
declare const __FP3D_WIZARD_HASH__: string;

let loading: Promise<typeof WizardBundle> | undefined;

export function loadWizard(): Promise<typeof WizardBundle> {
  const url = new URL(`./axonometra-wizard.js?v=${__FP3D_WIZARD_HASH__}`, new URL(import.meta.url)).href;
  loading ??= (import(/* @vite-ignore */ url) as Promise<typeof WizardBundle>).catch((err) => {
    loading = undefined;
    throw err;
  });
  return loading;
}

/** The host's saved plans, for the wizard's "Open Existing": a host that keeps no list (Home Assistant) has none. */
export function savedPlans(hass: HomeAssistant): SavedPlans {
  return {
    list: () =>
      hass.callWS<{ plans: SavedPlan[] }>({ type: "axonometra/saved/list" }).then(
        (r) => r.plans,
        () => [],
      ),
    open: async (id) => normalizeBuilding((await hass.callWS<{ building: Building }>({ type: "axonometra/saved/open", id })).building),
  };
}

/** The empty planner's button that opens the wizard. */
export function firstRunLabel(language: string | undefined): string {
  return (language ?? "en").toLowerCase().startsWith("de") ? "Los geht’s" : "Get Started";
}
