// Axonometra: the first-run wizard as a dialog over the planner. Its start page offers a new plan or an existing one
// (the host's saved plans, or a file from disk); a new plan has one more page, the basics of what was chosen. What
// that page asks, when it is ready and what finishing writes all live in flow.ts. Texts in English and German inline
// (the other languages come when the wizard is finished).

import { css, html, LitElement, nothing } from "lit";
import type { SavedPlan, SavedPlans } from "../host/types.ts";
import type { Building } from "../model.ts";
import { parseExport } from "../transfer.ts";
import { finish, MAX_ENGINES, outboardsFit, problems, ready, startState, vesselDefaults, type FirstRunResult, type FirstRunState, type Kind, type StepId, type VesselBasics } from "./flow.ts";
import { HULL_TYPES, hullType } from "./hulls.ts";
import { CARAVAN_SIZES, MAX_LEVELS, type CaravanBasics, type CaravanType, type HouseBasics } from "./structures.ts";

const EN = {
  title: "Get Started",
  close: "Close",
  back: "Back",
  next: "Next",
  finish: "Finish",
  mode_new: "New",
  mode_open: "Open Existing",
  examples: "Examples",
  kind_intro: "What would you like to plan?",
  kind_vessel: "A Boat, Ship, or Vessel",
  kind_building: "A Building, House, or Room",
  kind_caravan: "A Caravan or Mobile Home",
  agents: "To build your plan with an AI agent (Claude, ChatGPT, Gemini, Copilot, Cursor, and others), choose an option here, then connect the agent over MCP on the first page.",
  open_intro: "Which plan would you like to open?",
  open_none: "Nothing is saved here yet.",
  open_file: "Open a File from Disk",
  open_failed: "Could not open it: {reason}",
  open_bad_file: "That file is not a plan.",
  basics_intro: "Enter the basics to get started. Everything else can be set up once the plan is open.",
  hull: "Hull Type",
  length: "Length Overall (m)",
  beam: "Beam (m)",
  hull_beam: "Hull Beam (m)",
  draft: "Draft (m)",
  engine: "Engine Type",
  engine_outboard: "Outboard",
  engine_inboard: "Inboard",
  engines: "Number of Engines",
  width: "Width (m)",
  depth: "Depth (m)",
  levels: "Levels",
  basement: "Include a Basement",
  caravan_type: "Type",
  caravan_towed: "Caravan or Towed Mobile Home",
  caravan_rigid: "Rigid Mobile Home",
  body_length: "Length (m)",
  body_width: "Width (m)",
  bad_field: "Check the highlighted fields.",
  bad_outboards: "Outboards that fit across the transom at this beam: {n}.",
  failed: "Could not make the plan: {reason}",
};
type Texts = typeof EN;
const DE: Texts = {
  title: "Los geht’s",
  close: "Schließen",
  back: "Zurück",
  next: "Weiter",
  finish: "Fertig",
  mode_new: "Neu",
  mode_open: "Vorhandenen öffnen",
  examples: "Beispiele",
  kind_intro: "Was möchtest du planen?",
  kind_vessel: "Ein Boot, Schiff oder Wasserfahrzeug",
  kind_building: "Ein Gebäude, Haus oder Raum",
  kind_caravan: "Ein Wohnwagen oder Mobilheim",
  agents: "Um deinen Plan mit einem KI-Agenten zu bauen (Claude, ChatGPT, Gemini, Copilot, Cursor und andere), wähle hier eine Option und verbinde den Agenten dann auf der ersten Seite über MCP.",
  open_intro: "Welchen Plan möchtest du öffnen?",
  open_none: "Hier ist noch nichts gespeichert.",
  open_file: "Datei vom Datenträger öffnen",
  open_failed: "Konnte nicht geöffnet werden: {reason}",
  open_bad_file: "Diese Datei ist kein Plan.",
  basics_intro: "Gib die Eckdaten ein, um loszulegen. Alles Weitere stellst du ein, sobald der Plan offen ist.",
  hull: "Rumpftyp",
  length: "Länge über alles (m)",
  beam: "Breite (m)",
  hull_beam: "Breite eines Rumpfs (m)",
  draft: "Tiefgang (m)",
  engine: "Motortyp",
  engine_outboard: "Außenborder",
  engine_inboard: "Einbaumotor",
  engines: "Anzahl der Motoren",
  width: "Breite (m)",
  depth: "Tiefe (m)",
  levels: "Etagen",
  basement: "Mit Keller",
  caravan_type: "Typ",
  caravan_towed: "Wohnwagen oder gezogenes Mobilheim",
  caravan_rigid: "Wohnmobil",
  body_length: "Länge (m)",
  body_width: "Breite (m)",
  bad_field: "Bitte die markierten Felder prüfen.",
  bad_outboards: "Außenborder, die bei dieser Breite an den Spiegel passen: {n}.",
  failed: "Der Plan konnte nicht angelegt werden: {reason}",
};

const KINDS: Kind[] = ["vessel", "building", "caravan"];
const say = (text: string, vars: Record<string, string | number> = {}) => text.replace(/\{(\w+)\}/g, (_m, k: string) => String(vars[k] ?? ""));

export class FirstRunWizard extends LitElement {
  static properties = {
    language: {},
    _step: { state: true },
    _mode: { state: true },
    _saved: { state: true },
    _state: { state: true },
    _reading: { state: true },
    _error: { state: true },
  };

  declare language: string;
  declare _step: StepId;
  /** The start page's side: a new plan, or an existing one. */
  declare _mode: "new" | "open";
  /** The host's saved plans; null until it has answered. */
  declare _saved: SavedPlan[] | null;
  declare _state: FirstRunState;
  /** The saved plan being opened. */
  declare _reading: string | null;
  declare _error: string;

  /** The host's saved plans, offered under "Open Existing" besides a file from disk. */
  saved: SavedPlans | null = null;
  /** Called with the plan when the wizard finishes. */
  onFinish: ((result: FirstRunResult) => void) | null = null;
  /** Called when the wizard closes, finished or not. */
  onClose: (() => void) | null = null;

  constructor() {
    super();
    this.language = "en";
    this._step = "kind";
    this._mode = "new";
    this._saved = null;
    this._state = startState();
    this._reading = null;
    this._error = "";
  }

  private get t(): Texts {
    return this.language.toLowerCase().startsWith("de") ? DE : EN;
  }

  connectedCallback(): void {
    super.connectedCallback();
    void (this.saved?.list() ?? Promise.resolve([])).then(
      (list) => (this._saved = list),
      () => (this._saved = []),
    );
  }

  close(): void {
    this.remove();
    this.onClose?.();
  }

  private go(step: StepId): void {
    this._error = "";
    this._step = step;
  }

  private done(): void {
    let result: FirstRunResult;
    try {
      result = finish(this._state);
    } catch (e) {
      // measures no hull can be made at
      this._error = say(this.t.failed, { reason: (e as Error).message ?? String(e) });
      return;
    }
    this.onFinish?.(result);
    this.close();
  }

  /** An existing plan was chosen: the planner shows it. */
  private opened(building: Building): void {
    this.onFinish?.({ building, open: "view" });
    this.close();
  }

  private async openSaved(id: string): Promise<void> {
    if (!this.saved) return;
    this._error = "";
    this._reading = id;
    try {
      this.opened(await this.saved.open(id));
    } catch (e) {
      this._error = say(this.t.open_failed, { reason: (e as Error).message ?? String(e) });
    } finally {
      this._reading = null;
    }
  }

  private async openFile(e: Event): Promise<void> {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    this._error = "";
    try {
      this.opened(parseExport(await file.text()));
    } catch {
      this._error = this.t.open_bad_file;
    }
  }

  protected render() {
    const t = this.t;
    const s = this._state;
    const start = this._step === "kind";
    const mode = (m: "new" | "open") => html`<button data-mode=${m} class=${this._mode === m ? "on" : ""} @click=${() => ((this._error = ""), (this._mode = m))}>${t[`mode_${m}`]}</button>`;
    return html`<div class="box" role="dialog" aria-modal="true" aria-label=${t.title}>
      <header>
        <b>${t.title}</b>
        <button class="x" data-close @click=${() => this.close()} aria-label=${t.close}>✕</button>
      </header>
      ${start
        ? html`<nav>
            ${mode("new")}${mode("open")}
            <!-- sample plans of the kind chosen: still to come -->
            <button class="end" data-examples disabled>${t.examples}</button>
          </nav>`
        : nothing}
      <section data-body=${this._step}>${start ? (this._mode === "open" ? this.renderOpen() : this.renderKind()) : this.renderBasics()}</section>
      ${this._error ? html`<p class="err">${this._error}</p>` : nothing}
      <footer ?hidden=${start && this._mode === "open"}>
        <button data-back ?disabled=${start} @click=${() => this.go("kind")}>${t.back}</button>
        ${start
          ? html`<button class="primary" data-next ?disabled=${!ready(s, "kind")} @click=${() => this.go("basics")}>${t.next}</button>`
          : html`<button class="primary" data-finish ?disabled=${!ready(s, "basics")} @click=${() => this.done()}>${t.finish}</button>`}
      </footer>
    </div>`;
  }

  private renderKind() {
    const t = this.t;
    const pick = (kind: Kind) => {
      this._state = { ...this._state, kind };
      this.go("basics");
    };
    return html`<p>${t.kind_intro}</p>
      <div class="choices">${KINDS.map((k) => html`<button data-kind=${k} class=${this._state.kind === k ? "on" : ""} @click=${() => pick(k)}><b>${t[`kind_${k}`]}</b></button>`)}</div>
      <p class="muted" data-agents>${t.agents}</p>`;
  }

  private renderOpen() {
    const t = this.t;
    return html`<p>${t.open_intro}</p>
      <div class="choices">
        ${(this._saved ?? []).map((p) => html`<button data-saved=${p.id} ?disabled=${this._reading !== null} @click=${() => void this.openSaved(p.id)}><b>${p.name}</b></button>`)}
        ${this._saved?.length === 0 ? html`<p class="muted" data-saved-none>${t.open_none}</p>` : nothing}
        <button data-open-file ?disabled=${this._reading !== null} @click=${() => this.renderRoot.querySelector<HTMLInputElement>("[data-file]")?.click()}><b>${t.open_file}</b></button>
      </div>
      <input data-file type="file" accept="application/json,.json" hidden @change=${(e: Event) => void this.openFile(e)} />`;
  }

  private renderBasics() {
    const t = this.t;
    const s = this._state;
    const kind = s.kind ?? "building";
    const bad = new Set(problems(s));
    const number = (key: string, label: string, value: number, set: (v: number) => void, whole?: { min: number; max: number }) =>
      html`<label class=${bad.has(key) ? "bad" : ""}
        >${label}<input
          data-field=${key}
          type="number"
          min=${whole?.min ?? 0}
          max=${whole?.max ?? nothing}
          step=${whole ? 1 : 0.01}
          .value=${Number.isFinite(value) ? String(value) : ""}
          @change=${(e: Event) => set((e.target as HTMLInputElement).valueAsNumber)}
      /></label>`;
    const select = (key: string, label: string, value: string, options: { id: string; title: string }[], set: (v: string) => void, wide = false) =>
      html`<label class=${(bad.has(key) ? "bad" : "") + (wide ? " wide" : "")}
        >${label}<select data-field=${key} @change=${(e: Event) => set((e.target as HTMLSelectElement).value)}>
          ${options.map((o) => html`<option value=${o.id} ?selected=${o.id === value}>${o.title}</option>`)}
        </select></label
      >`;
    let fields;
    let note: string | null = null;
    if (kind === "vessel") {
      const v = s.vessel;
      const set = (change: Partial<VesselBasics>) => (this._state = { ...s, vessel: { ...v, ...change } });
      const fit = outboardsFit(v);
      if (v.engine === "outboard" && fit !== null && v.engines > fit) note = say(t.bad_outboards, { n: fit });
      fields = [
        // a hull type starts at its own size and engines
        select("hull", t.hull, v.hull, HULL_TYPES, (hull) => (this._state = { ...s, vessel: vesselDefaults(hull) })),
        number("length", t.length, v.length, (length) => set({ length })),
        number("beam", t.beam, v.beam, (beam) => set({ beam })),
        // a catamaran's hulls stand apart by her beam less theirs
        ...(hullType(v.hull)?.measures.hullBeam === undefined ? [] : [number("hullBeam", t.hull_beam, v.hullBeam ?? NaN, (hullBeam) => set({ hullBeam }))]),
        number("draft", t.draft, v.draft, (draft) => set({ draft })),
        select("engine", t.engine, v.engine, [{ id: "outboard", title: t.engine_outboard }, { id: "inboard", title: t.engine_inboard }], (engine) => set({ engine: engine as VesselBasics["engine"] })),
        number("engines", t.engines, v.engines, (engines) => set({ engines }), { min: 0, max: MAX_ENGINES }),
      ];
    } else if (kind === "caravan") {
      const c = s.caravan;
      const set = (change: Partial<CaravanBasics>) => (this._state = { ...s, caravan: { ...c, ...change } });
      fields = [
        // a type starts at its own size
        select("type", t.caravan_type, c.type, [{ id: "towed", title: t.caravan_towed }, { id: "rigid", title: t.caravan_rigid }], (type) => set({ type: type as CaravanType, ...CARAVAN_SIZES[type as CaravanType] }), true),
        number("length", t.body_length, c.length, (length) => set({ length })),
        number("width", t.body_width, c.width, (width) => set({ width })),
      ];
    } else {
      const b = s.building;
      const set = (change: Partial<HouseBasics>) => (this._state = { ...s, building: { ...b, ...change } });
      fields = [
        number("width", t.width, b.width, (width) => set({ width })),
        number("depth", t.depth, b.depth, (depth) => set({ depth })),
        number("levels", t.levels, b.levels, (levels) => set({ levels }), { min: 1, max: MAX_LEVELS }),
        html`<label class="check"><input data-field="basement" type="checkbox" .checked=${b.basement} @change=${(e: Event) => set({ basement: (e.target as HTMLInputElement).checked })} />${t.basement}</label>`,
      ];
    }
    return html`<h2>${t[`kind_${kind}`]}</h2>
      <p>${t.basics_intro}</p>
      <div class="grid">${fields}</div>
      ${bad.size ? html`<p class="err" data-bad>${note ?? t.bad_field}</p>` : nothing}`;
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
      width: min(640px, calc(100% - 32px));
      max-height: calc(100% - 32px);
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
    nav .end {
      margin-left: auto;
    }
    h2 {
      font-size: 17px;
      margin: 12px 0 0;
    }
    button,
    input,
    select {
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
      padding: 12px 14px;
    }
    .choices b {
      font-size: 17px;
    }
    .choices p {
      margin: 0;
    }
    [hidden] {
      display: none;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 8px;
    }
    label {
      display: grid;
      gap: 4px;
      min-width: 0;
    }
    /* a field keeps to its column, however long a select's longest option is */
    .grid input:not([type="checkbox"]),
    .grid select {
      width: 100%;
      box-sizing: border-box;
    }
    label.wide {
      grid-column: 1 / -1;
    }
    label.bad input,
    label.bad select {
      border-color: #ff6b6b;
    }
    label.check {
      display: flex;
      align-items: center;
      gap: 8px;
      align-self: end;
      padding: 7px 0;
    }
    .muted {
      opacity: 0.7;
    }
    .err {
      color: #ff9b9b;
    }
  `;
}

if (!customElements.get("axonometra-first-run")) customElements.define("axonometra-first-run", FirstRunWizard);
