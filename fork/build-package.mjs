// Axonometra: the npm package build (@axonometra/editor), the engine with no Home Assistant anywhere.
//
//   cd frontend && npm run build && node ../fork/build-package.mjs
//
// dist/npm/ is a self-contained folder, published as it is (package.json, README.md and CHANGELOG.md come from
// fork/package/; LICENSE and NOTICE from the repository root). index.js is the embedding API (frontend/src/host/embed.ts:
// mountAxonometra, the plan stores, the signal sources); it loads the engine's main bundle, axonometra.js, from
// beside itself, and that loads its other chunks the same way. three.js is only in axonometra-3d.js, which is
// loaded when a 3D view first opens. plans.js holds the example plans (frontend/src/plans/examples.ts).
//
// Only the chunks a host without Home Assistant can reach are shipped. The four that only Home Assistant uses
// (the dashboard card editor, locating, time travel and voice) stay out; the engine never asks for them unless
// the host says Home Assistant is there (HostOptions.homeAssistant), which this package's hosts do not.
//
// Type declarations for the public API are written to dist/npm/types/ (tsc, declarations only) and then checked
// by compiling a small consumer against them (fork/package/consumer.ts).

import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const frontend = join(root, "frontend");
const req = createRequire(join(frontend, "package.json"));
// esbuild is the frontend's own dev dependency
const { build } = req("esbuild");
const engine = join(root, "custom_components/axonometra/frontend");
const out = join(root, "dist/npm");

// the engine's chunks the package carries, and the asset folders they read
const CHUNKS = [
  "axonometra.js",
  "axonometra-3d.js",
  "axonometra-editor.js",
  "axonometra-vessel.js",
  "axonometra-wizard.js",
  "axonometra-fun.js",
];
const ASSETS = ["fonts", "images", "lang"];
const HOME_ASSISTANT_ONLY = ["axonometra-card-editor.js", "axonometra-locate.js", "axonometra-timetravel.js", "axonometra-voice.js"];

// size budgets: the host entry stays small; the whole folder is held to what it measured when the package was made
const BUDGETS = { "index.js": 48 * 1024, "plans.js": 64 * 1024 };
const TOTAL_BUDGET = 5 * 1024 * 1024;

if (!existsSync(join(engine, "axonometra.js"))) {
  console.error(`no engine bundles in ${engine}: run npm run build in frontend/ first`);
  process.exit(1);
}

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const file of CHUNKS) cpSync(join(engine, file), join(out, file));
for (const dir of ASSETS) cpSync(join(engine, dir), join(out, dir), { recursive: true });
// every file the engine folder holds is either shipped or deliberately left out, so a new chunk cannot slip by
const known = new Set([...CHUNKS, ...ASSETS, ...HOME_ASSISTANT_ONLY]);
const unknown = readdirSync(engine).filter((f) => !known.has(f));
if (unknown.length) {
  console.error(`engine files the package build does not know about: ${unknown.join(", ")} (ship or exclude them here)`);
  process.exit(1);
}

const bundle = (entry, file) =>
  build({
    entryPoints: [join(root, entry)],
    outfile: join(out, file),
    bundle: true,
    format: "esm",
    target: ["safari15", "chrome94", "firefox93", "edge94"],
    minify: true,
    legalComments: "none",
    logLevel: "warning",
  });
// the manifest, its documents, and the licence and notice the MIT terms require to travel with the code
cpSync(join(root, "fork/package/package.json"), join(out, "package.json"));
for (const f of ["README.md", "CHANGELOG.md"]) cpSync(join(root, "fork/package", f), join(out, f));
for (const f of ["LICENSE", "NOTICE"]) cpSync(join(root, f), join(out, f));
await bundle("frontend/src/host/embed.ts", "index.js");
await bundle("frontend/src/plans/examples.ts", "plans.js");

// type declarations for the public API, then a consumer compiled against them
const tsc = join(frontend, "node_modules/.bin/tsc");
const run = (args) => {
  const r = spawnSync(tsc, args, { cwd: frontend, stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);
};
run(["-p", join(root, "fork/package/tsconfig.types.json")]);
// the source imports its own files as .ts (allowImportingTsExtensions); a consumer resolves .js to the .d.ts
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));
for (const file of walk(join(out, "types")).filter((f) => f.endsWith(".d.ts"))) {
  const text = readFileSync(file, "utf8");
  const fixed = text.replace(/(from\s+|import\()(["'])(\.{1,2}\/[^"']+)\.ts\2/g, "$1$2$3.js$2");
  if (fixed !== text) writeFileSync(file, fixed);
}
// The plan model takes one plain string union (LampModel) from upstream's 3D viewer, whose declarations import
// three.js types that a consumer does not have (three.js is bundled into axonometra-3d.js, not a dependency).
// Inline each such type where it is used and drop the viewer's declarations; a viewer type that does need
// three.js fails the build here rather than in a consumer's typecheck.
const typesDir = join(out, "types");
const viewerDir = join(typesDir, "viewer");
const viewerDecl = (name) => {
  for (const file of walk(viewerDir)) {
    const m = readFileSync(file, "utf8").match(new RegExp(`export (type ${name}\\b[^;]*;)`));
    if (m) return m[1];
  }
  return null;
};
for (const file of walk(typesDir).filter((f) => f.endsWith(".d.ts") && !f.startsWith(viewerDir + "/"))) {
  let text = readFileSync(file, "utf8");
  const re = /^import type \{ ([^}]+) \} from "(\.{1,2}\/)+viewer\/[^"]+";\n/m;
  let m;
  while ((m = text.match(re))) {
    const decls = m[1].split(",").map((n) => n.trim()).map((name) => {
      const decl = viewerDecl(name);
      if (!decl || /THREE|three/.test(decl)) {
        console.error(`${file}: viewer type ${name} is not a plain alias; the package cannot expose it without three.js`);
        process.exit(1);
      }
      return decl;
    });
    text = text.replace(m[0], decls.join("\n") + "\n");
  }
  writeFileSync(file, text);
}
rmSync(viewerDir, { recursive: true, force: true });
run(["-p", join(root, "fork/package/tsconfig.consumer.json")]);
console.log("ok   type declarations: the consumer check compiles against dist/npm/types");

const sizeOf = (path) =>
  statSync(path).isDirectory() ? readdirSync(path).reduce((n, f) => n + sizeOf(join(path, f)), 0) : statSync(path).size;
let over = false;
for (const [file, budget] of Object.entries(BUDGETS)) {
  const size = statSync(join(out, file)).size;
  over ||= size > budget;
  console.log(`${size <= budget ? "ok  " : "OVER"} ${file}: ${(size / 1024).toFixed(1)} KB (budget ${budget / 1024} KB)`);
}
const total = sizeOf(out);
over ||= total > TOTAL_BUDGET;
console.log(`${total <= TOTAL_BUDGET ? "ok  " : "OVER"} package folder: ${(total / 1048576).toFixed(2)} MB (budget ${TOTAL_BUDGET / 1048576} MB)`);
console.log(`npm package build in ${out}`);
if (over) process.exit(1);
