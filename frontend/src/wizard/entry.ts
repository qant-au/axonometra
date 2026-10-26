// Accurona: the first-run wizard's bundle (accurona-wizard.js), loaded when a planner with an empty plan opens it.

import { FirstRunWizard } from "./dialog.ts";
import type { FirstRunResult } from "./flow.ts";

export type { FirstRunResult } from "./flow.ts";

/** Opens the wizard over the page (one at a time); `onFinish` gets the plan it writes. */
export function openFirstRun(language: string, onFinish: (result: FirstRunResult) => void, onClose?: () => void): FirstRunWizard {
  document.querySelector("accurona-first-run")?.remove();
  const el = document.createElement("accurona-first-run") as FirstRunWizard;
  el.language = language;
  el.onFinish = onFinish;
  el.onClose = onClose ?? null;
  document.body.append(el);
  return el;
}
