// Opt-in "help improve Axonometra" reports (custom_components/axonometra/diagnostics_report.py).
//
// Off by default. Only while the user switched it on in the editor, this page collects: its device class,
// browser and OS (name and major version), the 3D view's quality level, frame rate and GPU tier, how often
// the views were opened, and errors thrown by our own bundles (scrubbed). It pushes that to the backend at
// most every 10 minutes and when the page is hidden; the backend sends one report a day. Nothing here
// talks to the internet.

import type { HomeAssistant } from "./types.ts";

declare const __FP3D_VERSION__: string;
const VERSION = typeof __FP3D_VERSION__ === "string" ? __FP3D_VERSION__ : "dev";

/** Window event the editor (a bundle of its own) fires after switching the reports on or off. */
export const DIAGNOSTICS_EVENT = "axonometra-diagnostics";
const PUSH_INTERVAL = 10 * 60 * 1000;
const MAX_ERRORS = 20;
const MAX_MESSAGE = 200;

// ------------------------------------------------------------------------------- scrubbing (pure)

// Home Assistant domains whose "domain.object_id" is an entity id; any dotted word with an underscore
// after the dot counts as one too (code in an error message is mostly camelCase, e.g. "this.viewer")
const HA_DOMAINS =
  "alarm_control_panel|automation|binary_sensor|button|calendar|camera|climate|counter|cover|date|datetime|" +
  "device_tracker|event|fan|group|humidifier|image|input_boolean|input_button|input_datetime|input_number|" +
  "input_select|input_text|lawn_mower|light|lock|media_player|notify|number|person|remote|scene|script|select|" +
  "sensor|siren|sun|switch|text|time|timer|todo|update|vacuum|valve|water_heater|weather|zone";
const SCRUB: readonly [RegExp, string][] = [
  [/\b(?:https?|wss?|file|blob|data|ftp):[^\s'"<>)\]]*/gi, "<url>"],
  [/\beyJ[\w-]+\.[\w-]+\.[\w-]+/g, "<token>"],
  [/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, "<email>"],
  [/\b\d{1,3}(?:\.\d{1,3}){3}(?::\d+)?\b/g, "<ip>"],
  [/\b[0-9a-f]{1,4}(?::[0-9a-f]{0,4}){2,7}\b/gi, "<ip>"],
  [new RegExp(`\\b(?:${HA_DOMAINS})\\.[a-z0-9_]+\\b`, "g"), "<entity>"],
  [/\b[a-z][a-z0-9_]*\.[a-z0-9]*_[a-z0-9_]*\b/g, "<entity>"],
  [/\b[0-9a-f]{16,}\b/gi, "<id>"],
];

/** An error message without URLs, tokens, e-mail and IP addresses, entity ids and long ids; ≤ 200 chars. */
export function scrubMessage(text: unknown): string {
  let out = String(text ?? "");
  for (const [pattern, repl] of SCRUB) out = out.replace(pattern, repl);
  return out.replace(/\s+/g, " ").trim().slice(0, MAX_MESSAGE);
}

const OUR_FRAME = /(axonometra[\w-]*\.js)(?:\?[^:\s)]*)?:(\d+):(\d+)/;

/** Where in our bundles an error was thrown ("axonometra-3d.js:1:23456"), or null when it is not ours. */
export function ourFrame(stack: string | undefined, filename?: string, line?: number, col?: number): string | null {
  const m = OUR_FRAME.exec(stack ?? "");
  if (m) return `${m[1]}:${m[2]}:${m[3]}`;
  const file = /(axonometra[\w-]*\.js)(?:\?|$)/.exec(filename ?? "");
  return file ? `${file[1]}:${line ?? 0}:${col ?? 0}` : null;
}

// ------------------------------------------------------------------------------- classification (pure)

export type DeviceClass = "tablet" | "phone" | "desktop";

/** Phone, tablet or desktop from the User-Agent, the screen's shorter side (CSS px) and touch points. */
export function deviceClass(ua: string, shortSide: number, touchPoints: number): DeviceClass {
  if (/iPad|Tablet|Silk|\bKF[A-Z]{2,4}\b/.test(ua) || (/Macintosh/.test(ua) && touchPoints > 1)) return "tablet";
  if (/iPhone|iPod|Windows Phone/.test(ua)) return "phone";
  if (/Android/.test(ua)) return /Mobile/.test(ua) && shortSide < 600 ? "phone" : "tablet";
  if (touchPoints > 0 && shortSide > 0 && shortSide < 500) return "phone";
  return "desktop";
}

/** Browser name and major version ("Chrome 120"), or "other". */
export function browserOf(ua: string): string {
  const rules: [RegExp, string][] = [
    [/Edg(?:e|A|iOS)?\/(\d+)/, "Edge"],
    [/OPR\/(\d+)/, "Opera"],
    [/SamsungBrowser\/(\d+)/, "Samsung"],
    [/Silk\/(\d+)/, "Silk"],
    [/(?:Firefox|FxiOS)\/(\d+)/, "Firefox"],
    [/CriOS\/(\d+)/, "Chrome"],
    [/; wv\).*Chrome\/(\d+)/, "WebView"],
    [/Chrome\/(\d+)/, "Chrome"],
    [/Version\/(\d+)[\d.]* (?:Mobile\/\w+ )?Safari/, "Safari"],
  ];
  for (const [re, name] of rules) {
    const m = re.exec(ua);
    if (m) return `${name} ${m[1]}`;
  }
  if (/AppleWebKit/.test(ua) && /iPhone|iPad|Macintosh/.test(ua)) return "WebKit";
  return "other";
}

/** Operating system and major version ("Android 9", "iOS 17"), or "other". */
export function osOf(ua: string, touchPoints = 0): string {
  let m: RegExpExecArray | null;
  if ((m = /Android (\d+)/.exec(ua))) return `Android ${m[1]}`;
  if ((m = /iPad.*? OS (\d+)/.exec(ua))) return `iPadOS ${m[1]}`;
  if ((m = /(?:iPhone|iPod).*? OS (\d+)/.exec(ua))) return `iOS ${m[1]}`;
  if (/Macintosh/.test(ua)) return touchPoints > 1 ? "iPadOS" : "macOS";
  if ((m = /Windows NT (\d+)/.exec(ua))) return `Windows ${m[1]}`;
  if (/CrOS/.test(ua)) return "ChromeOS";
  if (/Linux/.test(ua)) return "Linux";
  return "other";
}

/** A rough GPU class from the WebGL renderer string (only the class is reported, never the name). */
export function gpuTier(renderer: string | null | undefined): "low" | "mid" | "high" | null {
  const r = renderer ?? "";
  if (!r.trim()) return null;
  if (/SwiftShader|llvmpipe|Software|Mali-[4T]|Mali-G(?:31|51|52|57)\b|Adreno[^\d]*[2-5]\d\d\b|PowerVR|Vivante|VideoCore|\bGC\d{3,4}\b|Intel.*\bHD Graphics(?:[2-5]\d{3})?\b/i.test(r)) return "low";
  if (/RTX|GTX|GeForce|Quadro|Radeon (?:RX|Pro)|Apple (?:M\d|GPU)|Adreno[^\d]*[67]\d\d\b|Mali-G7\d|Iris Xe|Intel.*Arc/i.test(r)) return "high";
  return "mid";
}

// ------------------------------------------------------------------------------- collector

interface ErrorEntry {
  msg: string;
  where: string;
  count: number;
  version: string;
}

let hassRef: HomeAssistant | undefined;
let checked = false;
let active = false;
let timer: ReturnType<typeof setInterval> | undefined;
let views: Record<string, number> = {};
let fpsSum = 0;
let fpsN = 0;
let lowEnd: boolean | null = null;
let renderScale: number | null = null;
let gpu: "low" | "mid" | "high" | null = null;
let errors: ErrorEntry[] = [];
const watchers = new Set<(on: boolean) => void>();

/** Whether the reports are on (this page collects). */
export function diagnosticsActive(): boolean {
  return active;
}

/** Be told when the reports are switched on or off; returns the function that stops it. */
export function watchDiagnostics(cb: (on: boolean) => void): () => void {
  watchers.add(cb);
  return () => watchers.delete(cb);
}

/** Learn once per page whether the reports are on (one local websocket call; nothing else while off). */
export function initDiagnostics(hass: HomeAssistant): void {
  hassRef = hass;
  if (checked) return;
  checked = true;
  window.addEventListener(DIAGNOSTICS_EVENT, (e) => {
    const on = !!(e as CustomEvent<{ enabled?: boolean }>).detail?.enabled;
    setActive(on);
  });
  void push();
}

/** Count that a view was opened ("3d", "editor", "extensions", "card", "walk"). */
export function countView(name: string): void {
  if (active) views[name] = (views[name] ?? 0) + 1;
}

/** A sample of the 3D view's stats while it moves (the viewer measures them anyway). */
export function recordFrame(stats: { fps: number; low: boolean; pixelRatio: number; gpu?: string | null }): void {
  if (!active) return;
  if (stats.fps > 0) {
    fpsSum += stats.fps;
    fpsN++;
  }
  lowEnd = stats.low;
  const dpr = window.devicePixelRatio || 1;
  renderScale = Math.round((stats.pixelRatio / dpr) * 100) / 100;
  if (stats.gpu !== undefined) gpu = gpuTier(stats.gpu);
}

function recordError(message: string, where: string | null): void {
  if (!where) return;
  const msg = scrubMessage(message);
  if (!msg) return;
  const hit = errors.find((e) => e.msg === msg && e.where === where);
  if (hit) hit.count++;
  else if (errors.length < MAX_ERRORS) errors.push({ msg, where, count: 1, version: VERSION });
}

function onError(e: ErrorEvent): void {
  const err = e.error as Error | undefined;
  const text = err ? `${err.name}: ${err.message}` : e.message;
  recordError(text, ourFrame(err?.stack, e.filename, e.lineno, e.colno));
}

function onRejection(e: PromiseRejectionEvent): void {
  const reason = e.reason as Error | undefined;
  if (!(reason instanceof Error)) return;
  recordError(`${reason.name}: ${reason.message}`, ourFrame(reason.stack));
}

function onHide(): void {
  void push();
}

function setActive(on: boolean): void {
  if (on === active) return;
  active = on;
  if (on) {
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    window.addEventListener("pagehide", onHide);
    timer = setInterval(() => void push(), PUSH_INTERVAL);
  } else {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
    window.removeEventListener("pagehide", onHide);
    clearInterval(timer);
    timer = undefined;
    views = {};
    fpsSum = fpsN = 0;
    errors = [];
  }
  for (const cb of watchers) cb(on);
}

/** This page's aggregate since the last push (the backend adds it to the day's per-client entry). */
export function clientAggregate(): Record<string, unknown> {
  const ua = navigator.userAgent;
  const touch = navigator.maxTouchPoints || 0;
  const shortSide = Math.min(screen.width || 0, screen.height || 0);
  return {
    device: deviceClass(ua, shortSide, touch),
    browser: browserOf(ua),
    os: osOf(ua, touch),
    low_end: lowEnd,
    render_scale: renderScale,
    fps: fpsN ? Math.round((fpsSum / fpsN) * 10) / 10 : null,
    fps_n: fpsN,
    gpu_tier: gpu,
    views: { ...views },
  };
}

async function push(): Promise<void> {
  const hass = hassRef;
  if (!hass) return;
  const msg: Record<string, unknown> = { type: "axonometra/diagnostics/client" };
  if (active) {
    msg.client = clientAggregate();
    msg.errors = errors;
  }
  const sentViews = views;
  const sentErrors = errors;
  if (active) {
    views = {};
    fpsSum = fpsN = 0;
    errors = [];
  }
  try {
    const res = await hass.callWS<{ enabled: boolean }>(msg);
    setActive(!!res?.enabled);
  } catch {
    // an older backend without the command, or no connection: keep what was not sent for the next push
    if (active) {
      for (const [k, v] of Object.entries(sentViews)) views[k] = (views[k] ?? 0) + v;
      errors = [...sentErrors, ...errors].slice(0, MAX_ERRORS);
    }
  }
}
