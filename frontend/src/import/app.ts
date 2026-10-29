// The import page (neonplan3d.mastershort.de/import/): a file from another program in, a Axonometra plan out. Everything
// runs in the browser – the file never leaves the computer.

import type { Building, Floor, Vec2 } from "../model.ts";
import { centroid, polygonArea } from "../model.ts";
import { EXPORT_FORMAT } from "../transfer.ts";
import { buildPlan, type BuildOptions, type BuildResult, type Warning } from "./builder.ts";
import { readFile, type ReadOptions, type ReadResult } from "./detect.ts";
import type { LayerRole } from "./dxf.ts";

const DE = {
  title: "Plan importieren",
  beta: "Beta – noch im Test. Klappt etwas nicht, schick uns die Datei gern mit einer kurzen Beschreibung auf GitHub (Issues) oder Discord.",
  lead: "Bring deinen Grundriss aus einem anderen Programm in Axonometra – Räume, Wände, Türen, Fenster und Möbel. Die Datei bleibt auf deinem Computer: alles läuft hier im Browser.",
  drop: "Datei hierher ziehen oder klicken",
  formats: "Sweet Home 3D (.sh3d) · iPhone-/iPad-Scan mit RoomPlan (.json) · CAD (.dxf) · 3D-Modell aus Blender, SketchUp & Co. (.glb, .gltf, .obj, .stl) · Floorplanner (.json) · Valetudo-Saugroboterkarte (.json) · Axonometra-Importformat oder ein Axonometra-Plan von einer KI (.json)",
  how: "So exportierst du aus …",
  how_items: [
    ["Sweet Home 3D", "Die gespeicherte .sh3d-Datei direkt hierher ziehen. Dateien aus Versionen vor 5.3 (2016) einmal in einer aktuellen Version öffnen und speichern."],
    ["iPhone/iPad mit LiDAR", "In einer Scan-App mit RoomPlan den Raum oder die Wohnung scannen und als RoomPlan-JSON (CapturedRoom/CapturedStructure) exportieren."],
    ["CAD / Architekt", "Als DXF speichern (z. B. AutoCAD, ArchiCAD, Revit, LibreCAD, magicplan). Wände, Räume, Türen und Fenster werden an den Layer-Namen erkannt; unten kannst du die Layer zuordnen."],
    ["Blender, SketchUp, Revit & Co.", "Als glTF/GLB, OBJ oder STL exportieren. Das Modell wird je Etage waagerecht geschnitten; Räume, Türen und Fenster ergeben sich aus den Wänden."],
    ["Floorplanner", "Projekt als JSON/FML exportieren."],
    ["Saugroboter mit Valetudo", "Die Karte als JSON speichern (Valetudo: Karte herunterladen bzw. /api/v2/robot/state/map). Jeder Raum der Karte wird ein Raum."],
    ["KI (ChatGPT, Claude …)", "Mit der Vorlage aus docs/ai-import.md einen Plan erzeugen lassen und die JSON-Datei hier prüfen und reparieren lassen."],
  ],
  reading: "Lese …",
  source: "Erkannt",
  floors: "Etagen",
  rooms: "Räume",
  doors: "Türen",
  windows: "Fenster",
  furniture: "Möbel",
  walls: "freie Wände",
  options: "Einstellungen",
  join: "Räume an den Wänden zusammenführen",
  join_hint: "Für Pläne, deren Räume an den Innenkanten der Wände gezeichnet sind: Nachbarräume teilen sich danach eine Wand.",
  square: "Fast gerade Kanten gerade ziehen",
  align: "Gerade ausrichten",
  align_hint: "Dreht den Plan so, dass die Wände waagerecht und senkrecht liegen (ein Scan oder eine Roboterkarte liegt oft schräg).",
  with_furniture: "Möbel übernehmen",
  mirror: "Spiegeln (links ↔ rechts)",
  turn: "Drehen",
  unit: "Einheit",
  auto: "automatisch",
  up: "Achse nach oben",
  levels: "Etagenhöhen (m, mit Komma)",
  levels_hint: "Gefunden: {levels}. Ändern, falls eine Etage fehlt oder zu viel ist, z. B. 0; 2,85",
  layers: "Layer",
  role_wall: "Wand",
  role_room: "Raum",
  role_door: "Tür",
  role_window: "Fenster",
  role_ignore: "ignorieren",
  preview: "Vorschau",
  room_names: "Räume umbenennen",
  download: "Axonometra-Datei herunterladen",
  next: "In Axonometra: Editor → Sicherung → Importieren … und diese Datei wählen. Danach Räume mit Home-Assistant-Bereichen verknüpfen und Geräte setzen.",
  warnings: "Hinweise",
  w_no_rooms: "Keine Räume gefunden.",
  w_no_rooms_found: "{floor}: aus den Wänden ergaben sich keine geschlossenen Räume – Layer oder Einheit prüfen.",
  w_room_tiny: "{floor}: einen sehr kleinen Raum weggelassen.",
  w_openings_dropped: "{floor}: {n} Türen/Fenster lagen an keiner Raumkante und wurden weggelassen.",
  w_furniture_unknown: "{floor}: {n} Möbel unbekannter Art wurden zu Schränken mit ihrem Namen.",
  w_furniture_mapped: "{floor}: {n} Möbel mit unbekanntem Typ wurden zugeordnet.",
  w_furniture_decor: "{floor}: {n} Deko- und Kleinteile (Bilder, Vasen, Vorhänge, Steckdosen …) weggelassen.",
  w_rooms_skipped: "{n} Räume mit zu wenigen Punkten weggelassen.",
  w_robot_map: "Die Räume stammen aus der Saugroboterkarte: Die Umrisse sind eine Näherung (der Roboter kommt nicht unter jedes Möbel) – Ecken im Editor nachziehen. Türen und Fenster kennt die Karte nicht, die setzt du im Editor.",
  e_unknown_format: "Dieses Dateiformat kenne ich nicht. Unterstützt sind die oben genannten.",
  e_not_json: "Die Datei ist kein gültiges JSON.",
  e_sh3d_old: "Diese Sweet-Home-3D-Datei ist zu alt (vor Version 5.3). Bitte in einer aktuellen Version öffnen und neu speichern.",
  e_sh3d_broken: "Die Sweet-Home-3D-Datei ist beschädigt.",
  e_nothing_found: "In der Datei habe ich keinen Grundriss gefunden.",
  e_dxf_broken: "Die DXF-Datei enthält keine Zeichnung (ENTITIES fehlt).",
  e_gltf_external: "Die glTF-Datei verweist auf externe Dateien. Bitte als .glb (alles in einer Datei) exportieren.",
  e_zip_broken: "Die Datei ist beschädigt.",
  e_not_plan: "Das ist kein vollständiger Axonometra-Plan.",
  privacy: "Datenschutz: Die Datei wird nur in deinem Browser gelesen und nirgendwohin hochgeladen. Wir zählen nur anonym, wie oft die Seite genutzt wird und welche Formate – ohne Cookies, ohne IP-Adresse, ohne Inhalte.",
  ai: "Plan mit KI erstellen: Vorlage",
  format_doc: "Importformat",
  floor_n: "Etage",
};
const EN: typeof DE = {
  title: "Import a plan",
  beta: "Beta – still being tested. If something goes wrong, please send us the file with a short note on GitHub (issues) or Discord.",
  lead: "Bring your floor plan from another program into Axonometra – rooms, walls, doors, windows and furniture. The file stays on your computer: everything runs here in the browser.",
  drop: "Drop a file here or click",
  formats: "Sweet Home 3D (.sh3d) · iPhone/iPad scan with RoomPlan (.json) · CAD (.dxf) · 3D model from Blender, SketchUp & co. (.glb, .gltf, .obj, .stl) · Floorplanner (.json) · Valetudo robot vacuum map (.json) · Axonometra import format or a Axonometra plan written by an AI (.json)",
  how: "How to export from …",
  how_items: [
    ["Sweet Home 3D", "Drop the saved .sh3d file here. Files from versions before 5.3 (2016): open and save them once in a current version."],
    ["iPhone/iPad with LiDAR", "Scan the room or home in a scanning app with RoomPlan and export the RoomPlan JSON (CapturedRoom/CapturedStructure)."],
    ["CAD / architect", "Save as DXF (e.g. AutoCAD, ArchiCAD, Revit, LibreCAD, magicplan). Walls, rooms, doors and windows are recognised by their layer names; you can assign the layers below."],
    ["Blender, SketchUp, Revit & co.", "Export as glTF/GLB, OBJ or STL. The model is cut horizontally on each storey; rooms, doors and windows follow from the walls."],
    ["Floorplanner", "Export the project as JSON/FML."],
    ["Robot vacuum with Valetudo", "Save the map as JSON (Valetudo: download the map, or /api/v2/robot/state/map). Every room of the map becomes a room."],
    ["AI (ChatGPT, Claude …)", "Let it write a plan with the template from docs/ai-import.md and have the JSON file checked and repaired here."],
  ],
  reading: "Reading …",
  source: "Recognised",
  floors: "Floors",
  rooms: "Rooms",
  doors: "Doors",
  windows: "Windows",
  furniture: "Furniture",
  walls: "free walls",
  options: "Settings",
  join: "Join rooms at their walls",
  join_hint: "For plans whose rooms are drawn at the inner faces of the walls: neighbouring rooms then share one wall.",
  square: "Straighten nearly straight edges",
  align: "Square to the axes",
  align_hint: "Turns the plan so the walls run horizontally and vertically (a scan or a robot map often lies at an angle).",
  with_furniture: "Take the furniture",
  mirror: "Mirror (left ↔ right)",
  turn: "Turn",
  unit: "Unit",
  auto: "automatic",
  up: "Axis pointing up",
  levels: "Floor levels (m, comma separated)",
  levels_hint: "Found: {levels}. Change it when a floor is missing or one too many, e.g. 0, 2.85",
  layers: "Layers",
  role_wall: "Wall",
  role_room: "Room",
  role_door: "Door",
  role_window: "Window",
  role_ignore: "ignore",
  preview: "Preview",
  room_names: "Rename rooms",
  download: "Download the Axonometra file",
  next: "In Axonometra: Editor → Backup → Import … and choose this file. Then link the rooms to Home Assistant areas and place your devices.",
  warnings: "Notes",
  w_no_rooms: "No rooms found.",
  w_no_rooms_found: "{floor}: the walls enclose no closed rooms – check the layers or the unit.",
  w_room_tiny: "{floor}: left out a very small room.",
  w_openings_dropped: "{floor}: {n} doors/windows lay on no room edge and were left out.",
  w_furniture_unknown: "{floor}: {n} pieces of an unknown kind became cabinets with their names.",
  w_furniture_mapped: "{floor}: {n} pieces with an unknown type were matched.",
  w_furniture_decor: "{floor}: left out {n} decorations and small things (pictures, vases, curtains, sockets …).",
  w_rooms_skipped: "Left out {n} rooms with too few points.",
  w_robot_map: "The rooms come from the robot vacuum's map: their outlines are an estimate (the robot does not reach under every piece of furniture) – adjust the corners in the editor. The map knows no doors or windows; place them in the editor.",
  e_unknown_format: "I do not know this file format. The ones listed above are supported.",
  e_not_json: "The file is no valid JSON.",
  e_sh3d_old: "This Sweet Home 3D file is too old (before version 5.3). Please open it in a current version and save it again.",
  e_sh3d_broken: "The Sweet Home 3D file is damaged.",
  e_nothing_found: "I found no floor plan in the file.",
  e_dxf_broken: "The DXF file holds no drawing (ENTITIES missing).",
  e_gltf_external: "The glTF file points to external files. Please export as .glb (all in one file).",
  e_zip_broken: "The file is damaged.",
  e_not_plan: "This is no complete Axonometra plan.",
  privacy: "Privacy: the file is only read in your browser and uploaded nowhere. We only count anonymously how often the page is used and which formats – no cookies, no IP address, no contents.",
  ai: "Create a plan with AI: template",
  format_doc: "Import format",
  floor_n: "Floor",
};

let lang = new URLSearchParams(location.search).get("lang") ?? ((navigator.language || "en").toLowerCase().startsWith("de") ? "de" : "en");
const T = () => (lang === "de" ? DE : EN);
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const fill = (s: string, v: Record<string, string | number | undefined>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));
const REPO = "https://github.com/Mastershort/neonplan3d/blob/main/docs";

interface State {
  name: string | null;
  bytes: Uint8Array | null;
  cache: { tris?: number[] };
  read: ReadResult | null;
  result: BuildResult | null;
  building: Building | null;
  error: string | null;
  busy: boolean;
  floor: number;
  names: Record<string, string>;
  build: BuildOptions;
  readOpt: ReadOptions;
  levelsText: string;
}

const state: State = { name: null, bytes: null, cache: {}, read: null, result: null, building: null, error: null, busy: false, floor: 0, names: {}, build: { square: true, furniture: true, mirror: false, turn: 0 }, readOpt: { roles: {}, dxfUnit: null, mesh: { up: "auto", unit: null, levels: null } }, levelsText: "" };

/**
 * Anonymous usage counts (is the page worth it?): page opened, a file read (its format) or not (its extension), a plan
 * downloaded. Only an event name goes out – no file, no names, no cookie – and only from the published page.
 */
function count(event: "open" | "read" | "fail" | "download", detail?: string): void {
  if (location.hostname !== "neonplan3d.mastershort.de") return;
  try {
    navigator.sendBeacon?.("https://api.mastershort.de/stats/v1/hit", JSON.stringify({ page: "import", event, detail: detail ? detail.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 16) : undefined }));
  } catch {
    /* counting is never worth an error */
  }
}

/** Each file counts once (re-reading it with other options does not). */
let counted = false;
let downloaded = false;

async function load(name: string, bytes: Uint8Array): Promise<void> {
  counted = false;
  downloaded = false;
  state.name = name;
  state.bytes = bytes;
  state.cache = {};
  state.names = {};
  state.floor = 0;
  state.build = { square: true, furniture: true, mirror: false, turn: 0 };
  state.readOpt = { roles: {}, dxfUnit: null, mesh: { up: "auto", unit: null, levels: null } };
  state.levelsText = "";
  await reread();
}

async function reread(): Promise<void> {
  if (!state.name || !state.bytes) return;
  state.busy = true;
  state.error = null;
  render();
  // let the page show "reading" before a large model blocks the thread
  await new Promise((r) => setTimeout(r, 30));
  try {
    state.read = await readFile(state.name, state.bytes, { ...state.readOpt, lang }, state.cache);
    if (!counted) count("read", state.read.kind === "mesh" ? (state.name.split(".").pop() ?? "mesh") : state.read.kind);
    counted = true;
    if (state.read.mesh && !state.levelsText) state.levelsText = state.read.mesh.levels.map((l) => String(l).replace(".", lang === "de" ? "," : ".")).join(lang === "de" ? "; " : ", ");
    rebuild();
  } catch (e) {
    state.read = null;
    state.result = null;
    state.building = null;
    const code = (e as Error).message;
    if (!counted) count("fail", state.name.includes(".") ? state.name.split(".").pop() : "none");
    counted = true;
    state.error = (T() as Record<string, unknown>)[`e_${code}`] ? String((T() as Record<string, unknown>)[`e_${code}`]) : `${code}`;
  }
  state.busy = false;
  render();
}

function rebuild(): void {
  const r = state.read;
  if (!r) return;
  if (r.building) {
    state.result = null;
    state.building = structuredClone(r.building);
  } else if (r.raw) {
    state.result = buildPlan(r.raw, { ...state.build, lang });
    state.building = structuredClone(state.result.building);
  }
  if (state.building) for (const [k, v] of Object.entries(state.names)) {
    const [fi, ri] = k.split(":").map(Number);
    const room = state.building.floors[fi]?.rooms[ri];
    if (room && v.trim()) room.name = v.trim();
  }
  state.floor = Math.min(state.floor, Math.max(0, (state.building?.floors.length ?? 1) - 1));
}

function stats(b: Building) {
  const f = b.floors;
  return {
    floors: f.length,
    rooms: f.reduce((s, x) => s + x.rooms.length, 0),
    doors: f.reduce((s, x) => s + x.openings.filter((o) => o.type !== "window").length, 0),
    windows: f.reduce((s, x) => s + x.openings.filter((o) => o.type === "window").length, 0),
    furniture: f.reduce((s, x) => s + x.furniture.length, 0),
    walls: f.reduce((s, x) => s + (x.walls?.length ?? 0), 0),
  };
}

function warningText(w: Warning): string {
  const t = (T() as Record<string, unknown>)[`w_${w.code}`];
  return typeof t === "string" ? fill(t, { floor: w.floor, n: w.n, name: w.name }) : w.code;
}

/** The floor drawn as SVG: rooms with names, free walls, doors and windows on their edges, furniture. */
function preview(f: Floor): string {
  const pts: Vec2[] = [...f.rooms.flatMap((r) => r.points), ...(f.walls ?? []).flatMap((w) => [w.a, w.b]), ...f.furniture.map((m) => [m.x, m.z] as Vec2)];
  if (!pts.length) return "";
  const x0 = Math.min(...pts.map((p) => p[0])) - 0.6;
  const z0 = Math.min(...pts.map((p) => p[1])) - 0.6;
  const x1 = Math.max(...pts.map((p) => p[0])) + 0.6;
  const z1 = Math.max(...pts.map((p) => p[1])) + 0.6;
  const fs = Math.max(0.22, Math.min(0.5, (x1 - x0) / 40));
  const out: string[] = [];
  for (const r of f.rooms) {
    out.push(`<polygon class="room" points="${r.points.map((p) => p.join(",")).join(" ")}"/>`);
  }
  for (const w of f.walls ?? []) out.push(`<line class="wall" x1="${w.a[0]}" y1="${w.a[1]}" x2="${w.b[0]}" y2="${w.b[1]}" stroke-width="${w.thickness ?? 0.12}"/>`);
  for (const m of f.furniture) {
    out.push(`<rect class="furn" x="${-m.w / 2}" y="${-m.d / 2}" width="${m.w}" height="${m.d}" transform="translate(${m.x} ${m.z}) rotate(${m.rotation})"/>`);
  }
  for (const o of f.openings) {
    const r = f.rooms.find((x) => x.id === o.room_id);
    let a: Vec2 | undefined;
    let b: Vec2 | undefined;
    if (o.wall) {
      const w = f.walls?.find((x) => x.id === o.wall);
      if (w) [a, b] = [w.a, w.b];
    } else if (r) [a, b] = [r.points[o.edge], r.points[(o.edge + 1) % r.points.length]];
    if (!a || !b) continue;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const u: Vec2 = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
    const s0 = o.offset - o.width / 2;
    const s1 = o.offset + o.width / 2;
    out.push(`<line class="${o.type === "window" ? "win" : "door"}" x1="${a[0] + u[0] * s0}" y1="${a[1] + u[1] * s0}" x2="${a[0] + u[0] * s1}" y2="${a[1] + u[1] * s1}"/>`);
  }
  for (const r of f.rooms) {
    const c = centroid(r.points);
    out.push(`<text x="${c[0]}" y="${c[1]}" font-size="${fs}">${esc(r.name)}</text><text class="area" x="${c[0]}" y="${c[1] + fs * 1.2}" font-size="${fs * 0.8}">${polygonArea(r.points).toFixed(1).replace(".", lang === "de" ? "," : ".")} m²</text>`);
  }
  return `<svg viewBox="${x0} ${z0} ${x1 - x0} ${z1 - z0}" preserveAspectRatio="xMidYMid meet">${out.join("")}</svg>`;
}

function optionsHtml(): string {
  const t = T();
  const r = state.read!;
  const o = state.build;
  const check = (key: keyof BuildOptions, label: string, hint = "") =>
    `<label class="check" title="${esc(hint)}"><input type="checkbox" data-opt="${key}" ${o[key] ?? (key === "join" ? r.raw?.roomsAtInnerFaces : key === "align" ? r.raw?.align : false) ? "checked" : ""}> ${esc(label)}</label>`;
  const parts: string[] = [];
  if (r.raw) {
    parts.push(check("join", t.join, t.join_hint), check("align", t.align, t.align_hint), check("square", t.square), check("furniture", t.with_furniture), check("mirror", t.mirror));
    parts.push(`<label>${esc(t.turn)} <select data-opt="turn">${[0, 90, 180, 270].map((v) => `<option value="${v}" ${o.turn === v ? "selected" : ""}>${v}°</option>`).join("")}</select></label>`);
  }
  if (r.kind === "dxf") {
    const units: [string, number | null][] = [[t.auto, null], ["mm", 0.001], ["cm", 0.01], ["m", 1], ["inch", 0.0254]];
    parts.push(`<label>${esc(t.unit)} <select data-read="dxfUnit">${units.map(([l, v]) => `<option value="${v ?? ""}" ${state.readOpt.dxfUnit === v ? "selected" : ""}>${esc(l)}${v === null && r.dxfUnit ? ` (${r.dxfUnit === 0.001 ? "mm" : r.dxfUnit === 0.01 ? "cm" : r.dxfUnit === 1 ? "m" : r.dxfUnit})` : ""}</option>`).join("")}</select></label>`);
    const roles: LayerRole[] = ["wall", "room", "door", "window", "ignore"];
    parts.push(
      `<div class="layers"><b>${esc(t.layers)}</b>${(r.layers ?? [])
        .map((l) => `<label><span>${esc(l.name)} <small>(${l.count})</small></span><select data-layer="${esc(l.name)}">${roles.map((x) => `<option value="${x}" ${l.role === x ? "selected" : ""}>${esc((t as Record<string, unknown>)[`role_${x}`] as string)}</option>`).join("")}</select></label>`)
        .join("")}</div>`,
    );
  }
  if (r.kind === "mesh") {
    const m = state.readOpt.mesh!;
    const units: [string, number | null][] = [[t.auto, null], ["mm", 0.001], ["cm", 0.01], ["m", 1], ["inch", 0.0254]];
    parts.push(`<label>${esc(t.unit)} <select data-mesh="unit">${units.map(([l, v]) => `<option value="${v ?? ""}" ${m.unit === v ? "selected" : ""}>${esc(l)}${v === null && r.mesh ? ` (${r.mesh.unit === 0.001 ? "mm" : r.mesh.unit === 0.01 ? "cm" : r.mesh.unit === 1 ? "m" : r.mesh.unit})` : ""}</option>`).join("")}</select></label>`);
    parts.push(`<label>${esc(t.up)} <select data-mesh="up">${(["auto", "y", "z"] as const).map((v) => `<option value="${v}" ${(m.up ?? "auto") === v ? "selected" : ""}>${v === "auto" ? `${esc(t.auto)} (${r.mesh?.up.toUpperCase()})` : v.toUpperCase()}</option>`).join("")}</select></label>`);
    parts.push(`<label class="wide">${esc(t.levels)} <input data-mesh="levels" value="${esc(state.levelsText)}"><small>${esc(fill(t.levels_hint, { levels: (r.mesh?.levels ?? []).join(" · ") }))}</small></label>`);
  }
  return parts.length ? `<section class="card"><h2>${esc(t.options)}</h2><div class="opts">${parts.join("")}</div></section>` : "";
}

function render(): void {
  const t = T();
  const root = document.getElementById("app")!;
  document.documentElement.lang = lang;
  document.title = `Axonometra – ${t.title}`;
  const b = state.building;
  const s = b ? stats(b) : null;
  const warns = [...(state.read?.warnings ?? []), ...(state.result?.warnings ?? [])];
  root.innerHTML = `
    <header>
      <a class="brand" href="../">Axonometra</a>
      <h1>${esc(t.title)} <span class="beta">Beta</span></h1>
      <button class="lang" data-lang="${lang === "de" ? "en" : "de"}">${lang === "de" ? "English" : "Deutsch"}</button>
    </header>
    <p class="lead">${esc(t.lead)}</p>
    <p class="beta-note">${esc(t.beta)}</p>
    <label class="drop ${state.busy ? "busy" : ""}" id="drop">
      <input type="file" id="file" accept=".sh3d,.dxf,.json,.fml,.glb,.gltf,.obj,.stl">
      <span class="big">${esc(state.busy ? t.reading : state.name ? state.name : t.drop)}</span>
      <span class="small">${esc(t.formats)}</span>
    </label>
    <details class="card"><summary>${esc(t.how)}</summary><dl>${t.how_items.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}</dl>
      <p><a href="${REPO}/ai-import.md" target="_blank" rel="noopener">${esc(t.ai)}</a> · <a href="${REPO}/plan-format.md" target="_blank" rel="noopener">${esc(t.format_doc)}</a></p></details>
    ${state.error ? `<p class="error">${esc(state.error)}</p>` : ""}
    ${
      b && s
        ? `<section class="card summary">
            <span>${esc(t.source)}: <b>${esc(state.read?.raw?.source ?? "Axonometra")}</b></span>
            <span><b>${s.floors}</b> ${esc(t.floors)}</span><span><b>${s.rooms}</b> ${esc(t.rooms)}</span><span><b>${s.doors}</b> ${esc(t.doors)}</span>
            <span><b>${s.windows}</b> ${esc(t.windows)}</span><span><b>${s.furniture}</b> ${esc(t.furniture)}</span>${s.walls ? `<span><b>${s.walls}</b> ${esc(t.walls)}</span>` : ""}
          </section>
          ${warns.length ? `<section class="card warn"><h2>${esc(t.warnings)}</h2><ul>${warns.map((w) => `<li>${esc(warningText(w))}</li>`).join("")}</ul></section>` : ""}
          ${optionsHtml()}
          <section class="card">
            <h2>${esc(t.preview)}</h2>
            <div class="tabs">${b.floors.map((f, i) => `<button data-floor="${i}" class="${i === state.floor ? "on" : ""}">${esc(f.name || `${t.floor_n} ${i + 1}`)}</button>`).join("")}</div>
            <div class="plan">${b.floors[state.floor] ? preview(b.floors[state.floor]) : ""}</div>
            <div class="legend"><i class="l-door"></i> ${esc(t.doors)} <i class="l-win"></i> ${esc(t.windows)} <i class="l-furn"></i> ${esc(t.furniture)}</div>
          </section>
          <section class="card">
            <h2>${esc(t.room_names)}</h2>
            <div class="names">${(b.floors[state.floor]?.rooms ?? []).map((r, i) => `<label><span>${polygonArea(r.points).toFixed(1).replace(".", lang === "de" ? "," : ".")} m²</span><input data-room="${state.floor}:${i}" value="${esc(r.name)}"></label>`).join("")}</div>
          </section>
          <section class="card go">
            <button id="download" class="primary">${esc(t.download)}</button>
            <p>${esc(t.next)}</p>
          </section>`
        : ""
    }
    <footer>${esc(t.privacy)} · <a href="https://github.com/Mastershort/neonplan3d" target="_blank" rel="noopener">GitHub</a></footer>`;
}

function download(): void {
  if (!state.building) return;
  if (!downloaded) count("download", state.read?.kind);
  downloaded = true;
  const base = (state.name ?? "plan").replace(/\.[^.]+$/, "").replace(/[^\w\-äöüÄÖÜß]+/g, "_").slice(0, 40);
  const file = { format: EXPORT_FORMAT, version: 1, exported_at: new Date().toISOString(), building: state.building };
  const url = URL.createObjectURL(new Blob([JSON.stringify(file, null, 2)], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `axonometra-import-${base}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

async function takeFile(f: File | undefined): Promise<void> {
  if (!f) return;
  await load(f.name, new Uint8Array(await f.arrayBuffer()));
}

function wire(): void {
  const root = document.getElementById("app")!;
  root.addEventListener("change", (e) => {
    const el = e.target as HTMLInputElement | HTMLSelectElement;
    if (el.id === "file") void takeFile((el as HTMLInputElement).files?.[0]);
    else if (el.dataset.opt) {
      const k = el.dataset.opt as keyof BuildOptions;
      if (k === "turn") state.build.turn = Number(el.value) as BuildOptions["turn"];
      else (state.build as Record<string, unknown>)[k] = (el as HTMLInputElement).checked;
      rebuild();
      render();
    } else if (el.dataset.layer) {
      state.readOpt.roles = { ...state.readOpt.roles, [el.dataset.layer]: el.value as LayerRole };
      void reread();
    } else if (el.dataset.read === "dxfUnit") {
      state.readOpt.dxfUnit = el.value ? Number(el.value) : null;
      void reread();
    } else if (el.dataset.mesh) {
      const m = (state.readOpt.mesh ??= {});
      if (el.dataset.mesh === "unit") m.unit = el.value ? Number(el.value) : null;
      if (el.dataset.mesh === "up") m.up = el.value as "auto" | "y" | "z";
      if (el.dataset.mesh === "levels") {
        state.levelsText = el.value;
        const list = el.value
          .split(lang === "de" ? /[;\s]+/ : /[,;\s]+/)
          .map((v) => parseFloat(v.replace(",", ".")))
          .filter((v) => Number.isFinite(v));
        m.levels = list.length ? list : null;
      }
      void reread();
    } else if (el.dataset.room) {
      state.names[el.dataset.room] = el.value;
      rebuild();
      render();
    }
  });
  root.addEventListener("click", (e) => {
    const el = (e.target as HTMLElement).closest("button") as HTMLButtonElement | null;
    if (!el) return;
    if (el.id === "download") download();
    else if (el.dataset.floor) {
      state.floor = Number(el.dataset.floor);
      render();
    } else if (el.dataset.lang) {
      lang = el.dataset.lang;
      void reread().then(render);
    }
  });
  root.addEventListener("dragover", (e) => {
    e.preventDefault();
    document.getElementById("drop")?.classList.add("over");
  });
  root.addEventListener("dragleave", () => document.getElementById("drop")?.classList.remove("over"));
  root.addEventListener("drop", (e) => {
    e.preventDefault();
    void takeFile(e.dataTransfer?.files?.[0]);
  });
}

wire();
render();
count("open");
