// Axonometra: the first-run wizard's bundle (axonometra-wizard.js), loaded when a planner with an empty plan opens it.

import { FirstRunWizard } from "./dialog.ts";
import type { FirstRunResult } from "./flow.ts";

export type { FirstRunResult } from "./flow.ts";

/**
 * Opens the wizard (one at a time per planner) in `host`; `onFinish` gets the plan it writes. The planner passes its
 * own shadow root, so the wizard covers that planner and not the rest of an embedding page; a planner that fills the
 * screen (the Home Assistant panel) still gets a full-screen wizard.
 */
export function openFirstRun(
  language: string,
  onFinish: (result: FirstRunResult) => void,
  onClose?: () => void,
  host: ParentNode = document.body,
): FirstRunWizard {
  host.querySelector("axonometra-first-run")?.remove();
  const el = document.createElement("axonometra-first-run") as FirstRunWizard;
  el.language = language;
  el.onFinish = onFinish;
  el.onClose = onClose ?? null;
  host.append(el);
  return el;
}
