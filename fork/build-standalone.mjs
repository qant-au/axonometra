// Axonometra: the standalone build, the engine with no Home Assistant anywhere.
//
//   cd frontend && npm run build && node ../fork/build-standalone.mjs
//
// dist/standalone/ gets the engine's bundles and assets exactly as built for the integration (the engine is the
// same code), plus axonometra-host.js (the embedding API, frontend/src/host/) and a demo page (index.html), and the
// hull viewer: axonometra-hulls.js (frontend/src/hull/viewer.ts, with three.js) and its page (hulls.html), and the
// example plans, axonometra-plans.js (frontend/src/plans/examples.ts), which index.html?example=<name> opens.
// Serve the folder over HTTP to use it; nothing in it talks to a server.

import { cpSync, mkdirSync, rmSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
// esbuild is the frontend's own dev dependency
const { build } = createRequire(join(root, "frontend/package.json"))("esbuild");
const engine = join(root, "custom_components/axonometra/frontend");
const out = join(root, "dist/standalone");
const BUDGET = 48 * 1024;
const HULLS_BUDGET = 760 * 1024;
const PLANS_BUDGET = 64 * 1024;

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(engine, out, { recursive: true });
cpSync(join(root, "fork/standalone/index.html"), join(out, "index.html"));
cpSync(join(root, "fork/standalone/hulls.html"), join(out, "hulls.html"));

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
await bundle("frontend/src/host/embed.ts", "axonometra-host.js");
await bundle("frontend/src/hull/viewer.ts", "axonometra-hulls.js");
await bundle("frontend/src/plans/examples.ts", "axonometra-plans.js");

let over = false;
for (const [file, budget] of [["axonometra-host.js", BUDGET], ["axonometra-hulls.js", HULLS_BUDGET], ["axonometra-plans.js", PLANS_BUDGET]]) {
  const size = statSync(join(out, file)).size;
  over ||= size > budget;
  console.log(`${size <= budget ? "ok  " : "OVER"} ${file}: ${(size / 1024).toFixed(1)} KB (budget ${budget / 1024} KB)`);
}
console.log(`standalone build in ${out}`);
if (over) process.exit(1);
