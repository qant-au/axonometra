// The hull viewer: any hull from the catalogue in 3D on the water, with its numbers. A heel slider floats it at that
// heel with its load (free to trim), the centre of gravity's height can be set, and the righting lever is drawn
// over 0 to 80°. Toggles show the station lines and the inner skin. Runs standalone (fork/standalone/hulls.html).

import {
  AmbientLight,
  Box3,
  BufferAttribute,
  BufferGeometry,
  CircleGeometry,
  Color,
  DirectionalLight,
  DoubleSide,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Quaternion,
  Scene,
  Vector3,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { CATALOGUE, type CatalogueHull } from "./catalogue.ts";
import { hydrostatics, type Hydrostatics } from "./hydrostatics.ts";
import { bodyMesh, ringsMesh, tubeGeometry, type Mesh as HullMesh } from "./mesh.ts";
import { bodyRange } from "./sections.ts";
import { innerBody } from "./skin.ts";
import { axes, float, hullMiddle, type Load } from "./stability.ts";
import type { Hull } from "./types.ts";

const COLOURS = { background: 0x070b14, topsides: 0xd4dbe6, boot: 0x1b2433, bottom: 0x8c2f2f, submarine: 0x3a414c, inner: 0xb08a52, part: 0x8a96a8, tube: 0xb4502a, water: 0x1d4e7a, lines: 0x37e0ff };
const DEG = Math.PI / 180;

export interface HullViewer {
  /** Show a hull from the catalogue by name. */
  show(name: string): void;
  /** Heel it (degrees, starboard down positive) and float it there with its load. */
  heel(degrees: number): void;
  /** Put the camera at an angle round the hull (degrees from astern, anticlockwise from above) and above the water. */
  orbit(azimuth: number, elevation: number): void;
  state(): { name: string; hydro: Hydrostatics; load: Load; heel: number; trim: number; gz: number; curve: [number, number][] };
  destroy(): void;
}

function geometry(m: HullMesh): BufferGeometry {
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(m.positions), 3));
  g.setIndex(m.indices);
  g.computeVertexNormals();
  return g;
}

/**
 * A hull's material, painted as boats are: antifouling below the design waterline, a boot-top stripe along it and
 * topsides above, by height in the hull's own frame (so the lines stay level with the hull as it heels, and crisp
 * whatever the mesh), or one dark grey for a submarine.
 */
function paint(size: number, submerged: boolean, see: boolean): MeshStandardMaterial {
  const m = new MeshStandardMaterial({ roughness: 0.55, metalness: 0.05, side: DoubleSide, transparent: see, opacity: see ? 0.25 : 1 });
  const stripe = Math.max(0.01, size / 300);
  const colour = (c: number) => new Color(submerged ? COLOURS.submarine : c);
  const uniforms = { uTop: { value: colour(COLOURS.topsides) }, uBoot: { value: colour(COLOURS.boot) }, uBottom: { value: colour(COLOURS.bottom) }, uLow: { value: -stripe / 3 }, uHigh: { value: stripe } };
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader.replace("#include <common>", "#include <common>\nvarying float vHullY;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvHullY = position.y;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying float vHullY;\nuniform vec3 uTop;\nuniform vec3 uBoot;\nuniform vec3 uBottom;\nuniform float uLow;\nuniform float uHigh;")
      .replace("vec4 diffuseColor = vec4( diffuse, opacity );", "vec4 diffuseColor = vec4( vHullY < uLow ? uBottom : vHullY < uHigh ? uBoot : uTop, opacity );");
  };
  m.customProgramCacheKey = () => `hull-paint:${stripe}:${submerged}`;
  return m;
}

/** The station lines: each section's outline, both sides, as line segments. */
function stationLines(hull: Hull): BufferGeometry {
  const pts: number[] = [];
  for (const body of hull.bodies) {
    const step = Math.max(1, Math.round(body.sections.length / 40));
    body.sections.forEach((s, k) => {
      if (k % step) return;
      for (let i = 1; i < s.points.length; i++) {
        const [y0, p0, s0] = s.points[i - 1];
        const [y1, p1, s1] = s.points[i];
        pts.push(s.x, y0, body.center + (s0 ?? p0), s.x, y1, body.center + (s1 ?? p1));
        pts.push(s.x, y0, body.center - p0, s.x, y1, body.center - p1);
      }
    });
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pts), 3));
  return g;
}

const fmt = (v: number, digits = 2) => (Math.abs(v) >= 1000 ? Math.round(v).toLocaleString("en") : v.toFixed(digits));
const mass = (t: number) => (t >= 1 ? `${fmt(t)} t` : `${fmt(t * 1000, 1)} kg`);

/**
 * Mount the viewer in `root`. `?hull=<name>` opens a hull; `?bare` shows the 3D view alone, with the hull's name and
 * note as a caption (for recordings).
 */
export function mountHullViewer(root: HTMLElement): HullViewer {
  root.innerHTML = `
    <style>
      .hv { display: grid; grid-template-columns: minmax(280px, 340px) 1fr; height: 100%; color: #cfd8ea; font: 13px/1.45 system-ui, sans-serif; background: #070b14; }
      .hv aside { overflow: auto; padding: 16px; border-right: 1px solid #1c2740; display: flex; flex-direction: column; gap: 12px; }
      .hv h1 { margin: 0; font-size: 16px; font-weight: 600; color: #eaf2ff; }
      .hv select, .hv input[type=number] { width: 100%; background: #0e1626; color: #eaf2ff; border: 1px solid #23324f; border-radius: 6px; padding: 6px; font: inherit; }
      .hv .note { color: #8fa3c4; }
      .hv table { width: 100%; border-collapse: collapse; }
      .hv td { padding: 2px 0; }
      .hv td:last-child { text-align: right; color: #eaf2ff; font-variant-numeric: tabular-nums; }
      .hv label { display: flex; align-items: center; gap: 8px; }
      .hv input[type=range] { flex: 1; }
      .hv .chart { background: #0b1220; border: 1px solid #1c2740; border-radius: 6px; }
      .hv .stage { position: relative; min-height: 360px; }
      .hv.bare { grid-template-columns: 1fr; }
      .hv.bare aside { display: none; }
      .hv .caption { position: absolute; left: 20px; bottom: 16px; color: #eaf2ff; font-size: 15px; text-shadow: 0 1px 3px #000; }
      .hv .caption span { display: block; color: #9fb2d2; font-size: 13px; }
      .hv canvas { display: block; }
      @media (max-width: 760px) { .hv { grid-template-columns: 1fr; grid-template-rows: auto 60vh; height: auto; } .hv aside { border-right: 0; order: 2; } }
    </style>
    <div class="hv">
      <aside>
        <h1>Hulls</h1>
        <select data-pick aria-label="Hull"></select>
        <div class="note" data-note></div>
        <table data-numbers></table>
        <label>Heel <input type="range" min="-60" max="60" step="1" value="0" data-heel /> <span data-heel-value>0°</span></label>
        <label>Centre of gravity above the water (m) <input type="number" step="0.05" data-vcg style="width: 7em" /></label>
        <label><input type="checkbox" data-stations /> Station lines</label>
        <label><input type="checkbox" data-inner /> Inner skin <span class="note" data-thickness></span></label>
        <div><div class="note">Righting lever GZ (m) against heel, 0 to 80°</div><svg class="chart" data-chart viewBox="0 0 300 140" width="100%"></svg></div>
      </aside>
      <div class="stage" data-stage><div class="caption" data-caption hidden></div></div>
    </div>`;
  const q = <T extends Element>(sel: string) => root.querySelector(sel) as T;
  const bare = new URLSearchParams(location.search).has("bare");
  if (bare) {
    q<HTMLDivElement>(".hv").classList.add("bare");
    q<HTMLDivElement>("[data-caption]").hidden = false;
  }
  const pick = q<HTMLSelectElement>("[data-pick]");
  const stage = q<HTMLDivElement>("[data-stage]");
  const heelInput = q<HTMLInputElement>("[data-heel]");
  const vcgInput = q<HTMLInputElement>("[data-vcg]");
  const stationsInput = q<HTMLInputElement>("[data-stations]");
  const innerInput = q<HTMLInputElement>("[data-inner]");

  const groups = new Map<string, HTMLOptGroupElement>();
  for (const e of CATALOGUE) {
    let g = groups.get(e.group);
    if (!g) {
      g = document.createElement("optgroup");
      g.label = e.group;
      groups.set(e.group, g);
      pick.append(g);
    }
    const o = document.createElement("option");
    o.value = e.name;
    o.textContent = e.name;
    g.append(o);
  }

  const renderer = new WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(2, globalThis.devicePixelRatio || 1));
  stage.append(renderer.domElement);
  const scene = new Scene();
  scene.background = new Color(COLOURS.background);
  scene.add(new AmbientLight(0xffffff, 0.55));
  const sun = new DirectionalLight(0xffffff, 1.6);
  sun.position.set(-1, 2, 1.5);
  scene.add(sun);
  const camera = new PerspectiveCamera(28, 1, 0.01, 10000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  const water = new Mesh(new CircleGeometry(1, 96), new MeshStandardMaterial({ color: COLOURS.water, transparent: true, opacity: 0.45, side: DoubleSide, depthWrite: false }));
  water.rotation.x = -Math.PI / 2;
  scene.add(water);
  const boat = new Group();
  scene.add(boat);

  let current: { name: string; built: CatalogueHull; hydro: Hydrostatics; load: Load; heel: number; trim: number; gz: number; curve: [number, number][]; size: number; frame: number; middle: Vector3 } | null = null;
  let token = 0;

  const resize = () => {
    const w = stage.clientWidth || 600;
    const h = stage.clientHeight || 400;
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = `${w}px`;
    renderer.domElement.style.height = `${h}px`;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(stage);

  /** Turn and lift the boat so its floating attitude sits on the level water at the origin. */
  const place = (heel: number, trim: number, level: number) => {
    if (!current) return;
    const { up } = axes(heel, trim);
    const rot = new Quaternion().setFromUnitVectors(new Vector3(...up), new Vector3(0, 1, 0));
    boat.quaternion.copy(rot);
    const anchor = new Vector3(hullMiddle(current.built.hull), level, 0).applyQuaternion(rot);
    boat.position.set(-anchor.x, -anchor.y, -anchor.z);
  };

  const build = () => {
    if (!current) return;
    for (const child of [...boat.children]) {
      boat.remove(child);
      if (child instanceof Mesh || child instanceof LineSegments) child.geometry.dispose();
    }
    const { hull, parts, tubes } = current.built;
    const showInner = innerInput.checked;
    const thickness = Math.max(0.003, current.size / 300);
    q<HTMLSpanElement>("[data-thickness]").textContent = showInner ? `(${fmt(thickness * 1000, 0)} mm plating)` : "";
    const skin = paint(current.size, (current.built.waterline ?? 0) > 0, showInner);
    for (const body of hull.bodies) boat.add(new Mesh(geometry(bodyMesh(body)), skin));
    if (showInner) {
      const inner = new MeshStandardMaterial({ color: COLOURS.inner, roughness: 0.8, side: DoubleSide });
      for (const body of hull.bodies) boat.add(new Mesh(geometry(bodyMesh(innerBody(body, thickness), 32, true)), inner));
    }
    const partMaterial = new MeshStandardMaterial({ color: COLOURS.part, roughness: 0.5, metalness: 0.3 });
    for (const p of parts ?? []) boat.add(new Mesh(geometry(ringsMesh(p)), partMaterial));
    const tubeMaterial = new MeshStandardMaterial({ color: COLOURS.tube, roughness: 0.7 });
    for (const t of tubes ?? []) boat.add(new Mesh(geometry(ringsMesh(tubeGeometry(t))), tubeMaterial));
    if (stationsInput.checked) boat.add(new LineSegments(stationLines(hull), new LineBasicMaterial({ color: COLOURS.lines, transparent: true, opacity: 0.6 })));
  };

  const numbers = () => {
    if (!current) return;
    const h = current.hydro;
    const gm = h.vcb + h.bmT - current.load.vcg;
    const rows: [string, string][] = [
      ["Length on the waterline", h.lwl > 0 ? `${fmt(h.lwl)} m` : "submerged"],
      ["Breadth on the waterline", h.bwl > 0 ? `${fmt(h.bwl)} m` : "submerged"],
      ["Displacement", mass(h.displacement)],
      ["Centre of buoyancy (along, height)", `${fmt(h.lcb)}, ${fmt(h.vcb)} m`],
      ["Waterplane", `${fmt(h.waterplane)} m²`],
      ["Metacentric radius BM", `${fmt(h.bmT)} m`],
      ["Metacentric height GM", `${fmt(gm)} m`],
      ["Heel, trim", `${fmt(current.heel / DEG, 1)}°, ${fmt(current.trim / DEG, 2)}°`],
      ["Righting lever GZ", `${fmt(current.gz, 3)} m`],
      ["Bodies, stations", `${current.built.hull.bodies.length}, ${current.built.hull.bodies.reduce((s, b) => s + b.sections.length, 0)}`],
    ];
    q<HTMLTableElement>("[data-numbers]").innerHTML = rows.map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join("");
  };

  const chart = () => {
    const svg = q<SVGSVGElement>("[data-chart]");
    if (!current) return;
    const pts = current.curve;
    const max = Math.max(0.05, ...pts.map(([, g]) => Math.abs(g)));
    const X = (deg: number) => 20 + (deg / 80) * 270;
    const Y = (g: number) => 70 - (g / max) * 60;
    const line = pts.map(([d, g], i) => `${i ? "L" : "M"}${X(d).toFixed(1)},${Y(g).toFixed(1)}`).join("");
    const at = current.heel / DEG;
    svg.innerHTML = `<line x1="20" y1="70" x2="290" y2="70" stroke="#2a3a5c"/><line x1="20" y1="8" x2="20" y2="132" stroke="#2a3a5c"/>
      ${[20, 40, 60, 80].map((d) => `<text x="${X(d)}" y="84" fill="#5d7090" font-size="9" text-anchor="middle">${d}°</text>`).join("")}
      <text x="24" y="16" fill="#5d7090" font-size="9">${fmt(max, 2)} m</text>
      <path d="${line}" fill="none" stroke="#37e0ff" stroke-width="1.6"/>
      ${at >= 0 && at <= 80 ? `<line x1="${X(at)}" y1="8" x2="${X(at)}" y2="132" stroke="#b4502a" stroke-dasharray="3 3"/>` : ""}`;
  };

  /** The righting lever over 0 to 80°, worked out a few heels at a time so the page stays live. */
  const curve = (my: number) => {
    if (!current) return;
    const c = current;
    c.curve = [];
    const degs = Array.from({ length: 17 }, (_, i) => i * 5);
    let near: ReturnType<typeof float>["attitude"] | undefined;
    const step = () => {
      if (my !== token || current !== c) return;
      for (let k = 0; k < 2 && degs.length; k++) {
        const d = degs.shift()!;
        const f = float(c.built.hull, c.load, d * DEG, 1, near);
        near = f.attitude;
        c.curve.push([d, f.gz]);
      }
      chart();
      if (degs.length) setTimeout(step, 0);
    };
    step();
  };

  /** The camera at an angle round the hull and above the water, far enough off to take it all in. */
  const orbit = (azimuth: number, elevation: number) => {
    if (!current) return;
    // a long lens from well off, round the middle of all that is drawn: the near end does not loom
    const r = current.frame * 1.25;
    const a = azimuth * DEG;
    const e = elevation * DEG;
    const c = current.middle;
    camera.position.set(c.x - Math.cos(a) * Math.cos(e) * r, c.y + Math.sin(e) * r, c.z + Math.sin(a) * Math.cos(e) * r);
    controls.target.copy(c);
    controls.update();
  };

  const heel = (degrees: number) => {
    if (!current) return;
    heelInput.value = String(degrees);
    q<HTMLSpanElement>("[data-heel-value]").textContent = `${degrees}°`;
    const f = float(current.built.hull, current.load, degrees * DEG, 1);
    current.heel = f.attitude.heel;
    current.trim = f.attitude.trim;
    current.gz = f.gz;
    place(f.attitude.heel, f.attitude.trim, f.attitude.level);
    numbers();
    chart();
  };

  const show = (name: string) => {
    const entry = CATALOGUE.find((e) => e.name === name) ?? CATALOGUE[0];
    pick.value = entry.name;
    q<HTMLDivElement>("[data-note]").textContent = entry.note;
    q<HTMLDivElement>("[data-caption]").innerHTML = `${entry.name}<span>${entry.note}</span>`;
    const built = entry.build();
    const hydro = hydrostatics(built.hull, built.waterline ?? 0);
    let x0 = Infinity;
    let x1 = -Infinity;
    let top = -Infinity;
    let low = Infinity;
    for (const b of built.hull.bodies) {
      const [a, c] = bodyRange(b);
      x0 = Math.min(x0, a);
      x1 = Math.max(x1, c);
      for (const s of b.sections) {
        top = Math.max(top, s.points[s.points.length - 1][0]);
        low = Math.min(low, s.points[0][0]);
      }
    }
    const size = x1 - x0;
    // a centre of gravity to start from: part way up the metacentric radius, below the deck; under B when submerged
    const vcg = hydro.waterplane > 0 ? Math.min(hydro.vcb + 0.4 * hydro.bmT, 0.5 * Math.max(0, top)) : hydro.vcb - 0.05 * (top - low);
    const load: Load = { displacement: hydro.displacement, lcg: hydro.lcb, vcg, tcg: hydro.tcb };
    vcgInput.value = vcg.toFixed(2);
    current = { name: entry.name, built, hydro, load, heel: 0, trim: 0, gz: 0, curve: [], size, frame: size, middle: new Vector3() };
    water.scale.setScalar(size * 8);
    water.position.y = 0;
    build();
    heel(0);
    // frame all of it: the hull, and the tubes and parts that reach beyond it
    const box = new Box3().setFromObject(boat);
    current.frame = box.getSize(new Vector3()).length();
    current.middle = box.getCenter(new Vector3());
    camera.near = size / 1000;
    camera.far = size * 50;
    camera.updateProjectionMatrix();
    orbit(225, 22);
    const my = ++token;
    curve(my);
    const url = new URL(location.href);
    url.searchParams.set("hull", entry.name);
    history.replaceState(null, "", url);
  };

  pick.addEventListener("change", () => show(pick.value));
  heelInput.addEventListener("input", () => heel(Number(heelInput.value)));
  vcgInput.addEventListener("change", () => {
    if (!current) return;
    const v = Number(vcgInput.value);
    if (!Number.isFinite(v)) return;
    current.load = { ...current.load, vcg: v };
    heel(Number(heelInput.value));
    curve(++token);
  });
  stationsInput.addEventListener("change", build);
  innerInput.addEventListener("change", build);

  let frame = 0;
  const loop = () => {
    frame = requestAnimationFrame(loop);
    controls.update();
    renderer.render(scene, camera);
  };
  resize();
  show(new URLSearchParams(location.search).get("hull") ?? "sailing-yacht-10m-keel");
  loop();

  return {
    show,
    heel,
    orbit,
    state: () => {
      const c = current!;
      return { name: c.name, hydro: c.hydro, load: c.load, heel: c.heel, trim: c.trim, gz: c.gz, curve: c.curve };
    },
    destroy: () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      renderer.dispose();
      root.innerHTML = "";
    },
  };
}
