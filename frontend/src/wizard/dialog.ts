// Accurona: the first-run wizard as a dialog over the planner. It draws the steps of flow.ts and nothing else: what a
// step needs, when it is ready and what finishing writes all live there. Texts in English and German inline (the
// other languages come when the wizard is finished).

import { css, html, LitElement, nothing } from "lit";
import { noDetails, VESSEL_SOURCES, type BatteryDetails, type EngineDetails, type TankDetails, type TankFluid, type VesselDetails, type VesselSource } from "./details.ts";
import { chosenSpec, detailsProblems, equipmentProblem, finish, nextStep, previousStep, reachable, startState, stepsFor, withDetails, withHull, type FirstRunResult, type FirstRunState, type StepId } from "./flow.ts";
import { fitHull, rankHulls } from "./hulls.ts";

const EN = {
  title: "Get started",
  close: "Close",
  back: "Back",
  next: "Next",
  finish: "Finish",
  s_kind: "Plan",
  s_source: "Source",
  s_details: "Details",
  s_hull: "Hull",
  s_equipment: "Equipment",
  s_review: "Review",
  kind_intro: "What would you like to plan?",
  kind_vessel: "A boat",
  kind_vessel_note: "Her hull from the library, fitted to her measures, with her engines, tanks and batteries.",
  kind_building: "A building or rooms",
  kind_building_note: "Draw the floors and rooms yourself in the editor.",
  source_intro: "Where should her details come from?",
  source_manual: "I'll type them in",
  source_example: "Example readings (to try the wizard)",
  source_reading: "Reading …",
  source_failed: "Could not read it: {reason}",
  details_intro: "Check her details. Measures in metres; only the length is needed.",
  name: "Name",
  mmsi: "MMSI",
  length: "Length overall (m)",
  beam: "Beam (m)",
  draft: "Draft (m)",
  airHeight: "Air height (m)",
  engines: "Engines",
  tanks: "Tanks",
  batteries: "Batteries",
  add_outboard: "Add outboard",
  add_inboard: "Add inboard",
  add_tank: "Add fuel tank",
  add_battery: "Add battery",
  remove: "Remove",
  none: "None",
  bad_field: "Check this measure.",
  hull_intro: "Choose her hull. The best fit is first; it is fitted to her measures.",
  hull_more: "More hulls join the library as they are finished.",
  fitted: "{length} m × {beam} m, draft {draft} m",
  equipment_intro: "This is what she carries. Leave out anything she doesn't have; you can move things in the editor.",
  equipment_none: "Nothing to confirm.",
  kg: "{kg} kg",
  on_mount: "on the transom",
  review_vessel: "{name} on the hull “{hull}”, with {n} items of equipment, lands on the water in 3D. Refine her in the editor.",
  review_building: "An empty plan opens in the editor, to draw the first floor.",
  unnamed: "Your boat",
};
type Texts = typeof EN;
const DE: Texts = {
  title: "Los geht’s",
  close: "Schließen",
  back: "Zurück",
  next: "Weiter",
  finish: "Fertig",
  s_kind: "Plan",
  s_source: "Quelle",
  s_details: "Angaben",
  s_hull: "Rumpf",
  s_equipment: "Ausrüstung",
  s_review: "Übersicht",
  kind_intro: "Was möchtest du planen?",
  kind_vessel: "Ein Boot",
  kind_vessel_note: "Ihr Rumpf aus der Bibliothek, auf ihre Maße gebracht, mit Motoren, Tanks und Batterien.",
  kind_building: "Ein Gebäude oder Räume",
  kind_building_note: "Etagen und Räume zeichnest du selbst im Editor.",
  source_intro: "Woher sollen ihre Angaben kommen?",
  source_manual: "Ich gebe sie selbst ein",
  source_example: "Beispielwerte (zum Ausprobieren)",
  source_reading: "Lese …",
  source_failed: "Konnte nicht gelesen werden: {reason}",
  details_intro: "Prüfe ihre Angaben. Maße in Metern; nötig ist nur die Länge.",
  name: "Name",
  mmsi: "MMSI",
  length: "Länge über alles (m)",
  beam: "Breite (m)",
  draft: "Tiefgang (m)",
  airHeight: "Höhe über Wasser (m)",
  engines: "Motoren",
  tanks: "Tanks",
  batteries: "Batterien",
  add_outboard: "Außenborder hinzufügen",
  add_inboard: "Einbaumotor hinzufügen",
  add_tank: "Kraftstofftank hinzufügen",
  add_battery: "Batterie hinzufügen",
  remove: "Entfernen",
  none: "Keine",
  bad_field: "Bitte dieses Maß prüfen.",
  hull_intro: "Wähle ihren Rumpf. Der passendste steht oben; er wird auf ihre Maße gebracht.",
  hull_more: "Weitere Rümpfe kommen in die Bibliothek, sobald sie fertig sind.",
  fitted: "{length} m × {beam} m, Tiefgang {draft} m",
  equipment_intro: "Das hat sie an Bord. Lass weg, was sie nicht hat; verschieben kannst du alles im Editor.",
  equipment_none: "Nichts zu bestätigen.",
  kg: "{kg} kg",
  on_mount: "am Spiegel",
  review_vessel: "{name} auf dem Rumpf „{hull}“, mit {n} Ausrüstungsteilen, liegt in 3D auf dem Wasser. Im Editor arbeitest du sie aus.",
  review_building: "Ein leerer Plan öffnet sich im Editor, für die erste Etage.",
  unnamed: "Dein Boot",
};

const MEASURES = ["length", "beam", "draft", "airHeight"] as const;
const say = (text: string, vars: Record<string, string | number> = {}) => text.replace(/\{(\w+)\}/g, (_m, k: string) => String(vars[k] ?? ""));
const unique = (prefix: string, taken: { id: string }[]) => {
  let i = taken.length + 1;
  while (taken.some((t) => t.id === `${prefix}${i}`)) i++;
  return `${prefix}${i}`;
};

export class FirstRunWizard extends LitElement {
  static properties = {
    language: {},
    _step: { state: true },
    _state: { state: true },
    _reading: { state: true },
    _error: { state: true },
  };

  declare language: string;
  declare _step: StepId;
  declare _state: FirstRunState;
  declare _reading: string | null;
  declare _error: string;

  /** The sources offered besides typing the details in. */
  sources: VesselSource[] = VESSEL_SOURCES;
  /** Called with the plan when the wizard finishes. */
  onFinish: ((result: FirstRunResult) => void) | null = null;
  /** Called when the wizard closes, finished or not. */
  onClose: (() => void) | null = null;

  constructor() {
    super();
    this.language = "en";
    this._step = "kind";
    this._state = startState();
    this._reading = null;
    this._error = "";
  }

  private get t(): Texts {
    return this.language.toLowerCase().startsWith("de") ? DE : EN;
  }

  close(): void {
    this.remove();
    this.onClose?.();
  }

  private set(next: FirstRunState): void {
    this._state = next;
  }

  private go(step: StepId | null): void {
    if (step) this._step = step;
  }

  private done(): void {
    const result = finish(this._state);
    this.onFinish?.(result);
    this.close();
  }

  private async pickSource(id: string): Promise<void> {
    this._error = "";
    if (id === "manual") {
      this.set(withDetails({ ...this._state, source: "manual" }, this._state.source === "manual" ? this._state.details : noDetails()));
      return;
    }
    const source = this.sources.find((s) => s.id === id);
    if (!source) return;
    this._reading = id;
    try {
      const can = await source.available();
      if (!can.ok) throw new Error(can.reason);
      this.set(withDetails({ ...this._state, source: id }, await source.read()));
      this.go(nextStep(this._state, "source"));
    } catch (e) {
      this._error = say(this.t.source_failed, { reason: (e as Error).message ?? String(e) });
      this.set({ ...this._state, source: null });
    } finally {
      this._reading = null;
    }
  }

  private editDetails(change: Partial<VesselDetails>): void {
    this.set(withDetails(this._state, { ...this._state.details, ...change }));
  }

  protected render() {
    const t = this.t;
    const s = this._state;
    const steps = stepsFor(s);
    const last = steps[steps.length - 1] === this._step;
    return html`<div class="box" role="dialog" aria-modal="true" aria-label=${t.title}>
      <header>
        <b>${t.title}</b>
        <button class="x" data-close @click=${() => this.close()} aria-label=${t.close}>✕</button>
      </header>
      <nav>
        ${steps.map((id) => html`<button data-step=${id} class=${this._step === id ? "on" : ""} ?disabled=${!reachable(s, id)} @click=${() => (this._step = id)}>${t[`s_${id}`]}</button>`)}
      </nav>
      <section data-body=${this._step}>${this.renderStep()}</section>
      ${this._error ? html`<p class="err">${this._error}</p>` : nothing}
      <footer>
        <button data-back ?disabled=${!previousStep(s, this._step)} @click=${() => this.go(previousStep(s, this._step))}>${t.back}</button>
        ${last
          ? html`<button class="primary" data-finish @click=${() => this.done()}>${t.finish}</button>`
          : html`<button class="primary" data-next ?disabled=${!nextStep(s, this._step)} @click=${() => this.go(nextStep(s, this._step))}>${t.next}</button>`}
      </footer>
    </div>`;
  }

  private renderStep() {
    switch (this._step) {
      case "kind":
        return this.renderKind();
      case "source":
        return this.renderSource();
      case "details":
        return this.renderDetails();
      case "hull":
        return this.renderHull();
      case "equipment":
        return this.renderEquipment();
      default:
        return this.renderReview();
    }
  }

  private renderKind() {
    const t = this.t;
    const pick = (kind: "vessel" | "building") => {
      this.set({ ...this._state, kind });
      this.go(nextStep(this._state, "kind"));
    };
    return html`<p>${t.kind_intro}</p>
      <div class="choices">
        <button data-kind="vessel" class=${this._state.kind === "vessel" ? "on" : ""} @click=${() => pick("vessel")}><b>${t.kind_vessel}</b><small>${t.kind_vessel_note}</small></button>
        <button data-kind="building" class=${this._state.kind === "building" ? "on" : ""} @click=${() => pick("building")}><b>${t.kind_building}</b><small>${t.kind_building_note}</small></button>
      </div>`;
  }

  private renderSource() {
    const t = this.t;
    const label = (s: VesselSource) => (s.id === "example" ? t.source_example : s.label);
    return html`<p>${t.source_intro}</p>
      <div class="choices">
        ${this.sources.map(
          (src) =>
            html`<button data-source=${src.id} class=${this._state.source === src.id ? "on" : ""} ?disabled=${this._reading !== null} @click=${() => void this.pickSource(src.id)}>
              <b>${label(src)}</b>${this._reading === src.id ? html`<small>${t.source_reading}</small>` : nothing}
            </button>`,
        )}
        <button
          data-source="manual"
          class=${this._state.source === "manual" ? "on" : ""}
          ?disabled=${this._reading !== null}
          @click=${() => {
            void this.pickSource("manual");
            this.go("details");
          }}
        >
          <b>${t.source_manual}</b>
        </button>
      </div>`;
  }

  private renderDetails() {
    const t = this.t;
    const d = this._state.details;
    const bad = new Set(detailsProblems(d));
    const num = (v: string) => (v.trim() === "" ? undefined : Number(v));
    const text = (key: "name" | "mmsi") =>
      html`<label>${t[key]}<input data-field=${key} .value=${d[key] ?? ""} @change=${(e: Event) => this.editDetails({ [key]: (e.target as HTMLInputElement).value.trim() || undefined })} /></label>`;
    const measure = (key: (typeof MEASURES)[number]) =>
      html`<label class=${bad.has(key) ? "bad" : ""}>${t[key]}<input data-field=${key} type="number" min="0" step="0.01" .value=${d[key] === undefined ? "" : String(d[key])} @change=${(e: Event) => this.editDetails({ [key]: num((e.target as HTMLInputElement).value) })} /></label>`;
    const list = <T extends { id: string }>(title: string, kind: "engines" | "tanks" | "batteries", items: T[], describe: (x: T) => string, adds: [string, () => T][]) =>
      html`<fieldset data-list=${kind}>
        <legend>${title}</legend>
        ${items.length ? items.map((x) => html`<div class="row"><span>${describe(x)}</span><button @click=${() => this.editDetails({ [kind]: items.filter((y) => y !== x) })}>${t.remove}</button></div>`) : html`<div class="row muted">${t.none}</div>`}
        <div class="row">${adds.map(([label, make]) => html`<button data-add=${label} @click=${() => this.editDetails({ [kind]: [...items, make()] })}>${label}</button>`)}</div>
      </fieldset>`;
    const engine = (kind: EngineDetails["kind"]) => (): EngineDetails => ({ id: unique(kind === "outboard" ? "outboard " : "engine ", d.engines), kind });
    const tank = (fluid: TankFluid) => (): TankDetails => ({ id: unique(`${fluid}.`, d.tanks), fluid, capacity: 0.1 });
    const battery = (): BatteryDetails => ({ id: unique("battery ", d.batteries), capacity: 100 });
    return html`<p>${t.details_intro}</p>
      <div class="grid">${text("name")}${text("mmsi")}${MEASURES.map(measure)}</div>
      ${bad.size ? html`<p class="err">${t.bad_field}</p>` : nothing}
      ${list(t.engines, "engines", d.engines, (e) => `${e.id}${e.kind ? ` · ${e.kind}` : ""}${e.power ? ` · ${Math.round(e.power / 1000)} kW` : ""}`, [
        [t.add_outboard, engine("outboard")],
        [t.add_inboard, engine("inboard")],
      ])}
      ${list(t.tanks, "tanks", d.tanks, (x) => `${x.id}${x.capacity ? ` · ${Math.round(x.capacity * 1000)} L` : ""}`, [[t.add_tank, tank("fuel")]])}
      ${list(t.batteries, "batteries", d.batteries, (b) => `${b.id}${b.capacity ? ` · ${b.capacity} Ah` : ""}`, [[t.add_battery, battery]])}`;
  }

  private renderHull() {
    const t = this.t;
    const s = this._state;
    return html`<p>${t.hull_intro}</p>
      <div class="choices">
        ${rankHulls(s.details).map((h) => {
          const p = fitHull(h, s.details).hull.plate;
          return html`<button data-hull=${h.id} class=${s.hull === h.id ? "on" : ""} @click=${() => this.set(withHull(s, h.id))}>
            <b>${h.title}</b><small>${h.note}</small><small>${say(t.fitted, { length: p.length, beam: p.beam, draft: p.draft })}</small>
          </button>`;
        })}
      </div>
      <p class="muted">${t.hull_more}</p>`;
  }

  private renderEquipment() {
    const t = this.t;
    const s = this._state;
    const problem = equipmentProblem(s);
    return html`<p>${t.equipment_intro}</p>
      ${s.equipment.length
        ? s.equipment.map(
            (p, i) =>
              html`<label class="row" data-equipment=${p.key}
                ><input
                  type="checkbox"
                  .checked=${p.include}
                  @change=${(e: Event) => this.set({ ...s, equipment: s.equipment.map((q, j) => (j === i ? { ...q, include: (e.target as HTMLInputElement).checked } : q)) })}
                /><span>${p.component.name}</span><small>${say(t.kg, { kg: p.component.mass })}${p.component.mount ? ` · ${t.on_mount}` : ""}</small></label
              >`,
          )
        : html`<p class="muted">${t.equipment_none}</p>`}
      ${problem ? html`<p class="err">${problem}</p>` : nothing}`;
  }

  private renderReview() {
    const t = this.t;
    const s = this._state;
    if (s.kind !== "vessel") return html`<p data-review="building">${t.review_building}</p>`;
    const spec = chosenSpec(s);
    const hull = rankHulls(s.details).find((h) => h.id === s.hull);
    return html`<p data-review="vessel">${say(t.review_vessel, { name: s.details.name || t.unnamed, hull: hull?.title ?? "", n: s.equipment.filter((e) => e.include).length })}</p>
      ${spec ? html`<p class="muted">${say(t.fitted, { length: spec.hull.plate.length, beam: spec.hull.plate.beam, draft: spec.hull.plate.draft })}</p>` : nothing}`;
  }

  static styles = css`
    :host {
      position: fixed;
      inset: 0;
      z-index: 10000;
      display: grid;
      place-items: center;
      background: #02060fcc;
      font: 14px/1.4 system-ui, sans-serif;
      color: #e6f7ff;
    }
    .box {
      width: min(640px, calc(100vw - 32px));
      max-height: calc(100vh - 32px);
      overflow: auto;
      box-sizing: border-box;
      background: #0b1120;
      border: 1px solid #37e0ff66;
      border-radius: 14px;
      padding: 16px;
      box-shadow: 0 10px 40px #000a;
    }
    header,
    footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
    }
    footer {
      margin-top: 14px;
    }
    nav {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin: 10px 0;
    }
    button,
    input {
      font: inherit;
      color: #e6f7ff;
      background: #16233d;
      border: 1px solid #37e0ff44;
      border-radius: 8px;
      padding: 7px 10px;
    }
    button {
      cursor: pointer;
    }
    button:disabled {
      opacity: 0.5;
      cursor: default;
    }
    button.on,
    button.primary {
      background: #37e0ff;
      color: #04121c;
      font-weight: 700;
    }
    .choices {
      display: grid;
      gap: 8px;
    }
    .choices button {
      display: grid;
      gap: 2px;
      text-align: left;
      padding: 10px 12px;
    }
    small {
      opacity: 0.8;
      font-weight: 400;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 8px;
    }
    label {
      display: grid;
      gap: 4px;
    }
    label.bad input {
      border-color: #ff6b6b;
    }
    fieldset {
      border: 1px solid #37e0ff33;
      border-radius: 10px;
      margin: 10px 0 0;
      padding: 8px 10px;
    }
    .row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      margin: 4px 0;
    }
    .row span {
      flex: 1;
    }
    .muted {
      opacity: 0.7;
    }
    .err {
      color: #ff9b9b;
    }
  `;
}

if (!customElements.get("accurona-first-run")) customElements.define("accurona-first-run", FirstRunWizard);
