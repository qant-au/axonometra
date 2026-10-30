// Axonometra: the npm package tested as a consumer gets it, from the packed tarball (run fork/build-package.mjs first).
//
//   cd frontend && npm run build && node ../fork/build-package.mjs && node ../fork/pack-test.mjs
//
// 1. npm pack dist/npm; the tarball's size, its file list against an allow-list, and its manifest.
// 2. Install the tarball into a throwaway consumer (dist/pack-test/consumer) and typecheck a consumer through the
//    package's real exports (no path mapping), with skipLibCheck off.
// 3. Run fork/smoke-standalone.mjs against the INSTALLED package: every check it makes of the standalone build
//    (mount, editor, a saved plan, Home Assistant's parts hidden, example plans, the vessel bundle, the wizard, masses),
//    plus its wire check, so a chunk the package left out shows as a 404.
// 4. A consumer bundled with esbuild, which cannot inline the engine, mounts it through bundleUrl.
// 5. three.js is only in axonometra-3d.js.
// Screenshots go to dist/pack-test/shots. CHROME_PATH overrides the browser.

import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const frontend = join(root, "frontend");
const req = createRequire(join(frontend, "package.json"));
const pkgDir = join(root, "dist/npm");
const work = join(root, "dist/pack-test");
const consumer = join(work, "consumer");
const shots = join(work, "shots");
const TARBALL_BUDGET = 2 * 1024 * 1024;
const HOME_ASSISTANT_ONLY = ["axonometra-card-editor.js", "axonometra-locate.js", "axonometra-timetravel.js", "axonometra-voice.js"];
const failures = [];
const ok = (msg) => console.log(`ok   ${msg}`);

if (!existsSync(join(pkgDir, "package.json"))) {
  console.error("No package build: run node ../fork/build-package.mjs first.");
  process.exit(2);
}
rmSync(work, { recursive: true, force: true });
mkdirSync(shots, { recursive: true });
mkdirSync(consumer, { recursive: true });

// 1. the tarball
const packed = JSON.parse(execFileSync("npm", ["pack", pkgDir, "--pack-destination", work, "--json"], { cwd: work, encoding: "utf8" }))[0];
const tarball = join(work, packed.filename);
const size = statSync(tarball).size;
if (size > TARBALL_BUDGET) failures.push(`tarball is ${(size / 1048576).toFixed(2)} MB (budget ${TARBALL_BUDGET / 1048576} MB)`);
const files = packed.files.map((f) => f.path);
const allowed = [
  /^(index|plans|axonometra|axonometra-(3d|editor|vessel|wizard|fun))\.js$/,
  /^types\/.+\.d\.ts$/,
  /^fonts\/[A-Za-z-]+\.(woff2|txt)$/,
  /^images\/[a-z0-9-]+\.(jpg|png|svg)$/,
  /^lang\/[a-z]{2}\.json$/,
  /^(package\.json|README\.md|CHANGELOG\.md|LICENSE|NOTICE)$/,
];
const stray = files.filter((f) => !allowed.some((re) => re.test(f)));
if (stray.length) failures.push(`files outside the allow-list: ${stray.join(", ")}`);
for (const must of ["LICENSE", "NOTICE", "README.md", "CHANGELOG.md", "package.json", "index.js", "plans.js", "axonometra.js",
  "axonometra-3d.js", "types/host/embed.d.ts", "types/plans/examples.d.ts", "fonts/figtree-LICENSE.txt", "fonts/bricolage-grotesque-LICENSE.txt"]) {
  if (!files.includes(must)) failures.push(`the tarball has no ${must}`);
}
for (const chunk of HOME_ASSISTANT_ONLY) if (files.includes(chunk)) failures.push(`the tarball carries the Home Assistant-only ${chunk}`);
const manifest = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8"));
if (manifest.name !== "@axonometra/editor") failures.push(`package name is ${manifest.name}`);
if (!/^0\.\d+\.\d+$/.test(manifest.version)) failures.push(`version ${manifest.version} is not a pre-1.0 x.y.z`);
if (manifest.license !== "MIT") failures.push(`licence is ${manifest.license}`);
if (Object.keys(manifest.dependencies ?? {}).length) failures.push(`runtime dependencies: ${Object.keys(manifest.dependencies).join(", ")} (the engine bundles its own)`);
if (manifest.repository?.url !== "git+https://github.com/qant-au/axonometra.git") failures.push(`repository is ${manifest.repository?.url} (provenance needs the repo that publishes)`);
for (const [sub, target] of Object.entries(manifest.exports)) {
  for (const path of typeof target === "string" ? [target] : Object.values(target)) {
    if (!files.includes(path.replace(/^\.\//, ""))) failures.push(`exports["${sub}"] points at ${path}, which is not in the tarball`);
  }
}
ok(`tarball ${packed.filename}: ${(size / 1048576).toFixed(2)} MB, ${files.length} files, manifest ${manifest.name}@${manifest.version}`);

// 2. installed into a consumer, typechecked through the real exports
writeFileSync(join(consumer, "package.json"), JSON.stringify({ name: "axonometra-consumer", private: true, type: "module" }, null, 2));
execFileSync("npm", ["install", tarball, "--no-audit", "--no-fund", "--ignore-scripts", "--loglevel=error"], { cwd: consumer, stdio: "inherit" });
const installed = join(consumer, "node_modules/@axonometra/editor");
cpSync(join(root, "fork/package/consumer.ts"), join(consumer, "consumer.ts"));
writeFileSync(
  join(consumer, "tsconfig.json"),
  JSON.stringify({
    compilerOptions: { target: "ES2022", module: "ESNext", moduleResolution: "bundler", lib: ["ES2023", "DOM", "DOM.Iterable"], types: [], strict: true, noEmit: true, skipLibCheck: false },
    files: ["consumer.ts"],
  }),
);
const tsc = spawnSync(join(frontend, "node_modules/.bin/tsc"), ["-p", join(consumer, "tsconfig.json")], { encoding: "utf8" });
if (tsc.status !== 0) failures.push(`the consumer does not typecheck against the installed package:\n${tsc.stdout}${tsc.stderr}`);
else ok("a consumer typechecks against the installed package through its exports");

// 3. the standalone smoke checks, against the installed package
const page = readFileSync(join(root, "fork/standalone/index.html"), "utf8")
  .replace('"./axonometra-host.js"', '"./node_modules/@axonometra/editor/index.js"')
  .replace('"./axonometra-plans.js"', '"./node_modules/@axonometra/editor/plans.js"');
if (!page.includes("node_modules/@axonometra/editor/index.js") || !page.includes("node_modules/@axonometra/editor/plans.js")) {
  failures.push("the demo page's imports changed: fork/pack-test.mjs no longer rewrites them to the package");
}
writeFileSync(join(consumer, "index.html"), page);
const smoke = spawnSync(process.execPath, [join(root, "fork/smoke-standalone.mjs")], {
  cwd: frontend,
  env: { ...process.env, SMOKE_DIR: consumer, SMOKE_PAGE: "index.html", SMOKE_SHOTS: shots },
  encoding: "utf8",
});
process.stdout.write(smoke.stdout);
if (smoke.status !== 0) failures.push(`the smoke checks fail against the installed package:\n${smoke.stderr}`);

// 4. a bundled consumer, mounting through bundleUrl
writeFileSync(
  join(consumer, "app.js"),
  `import { memoryStore, mountAxonometra } from "@axonometra/editor";
import { examplePlan } from "@axonometra/editor/plans";
const { building } = examplePlan("shed-workshop");
window.axonometra = await mountAxonometra(document.querySelector("#plan"), {
  store: memoryStore({ building }),
  language: "en",
  bundleUrl: "/node_modules/@axonometra/editor/axonometra.js",
});
`,
);
await req("esbuild").build({ entryPoints: [join(consumer, "app.js")], outfile: join(consumer, "bundled/app.js"), bundle: true, format: "esm", absWorkingDir: consumer, logLevel: "warning" });
writeFileSync(
  join(consumer, "bundled/index.html"),
  '<!doctype html><html lang="en"><head><meta charset="utf-8"><link rel="icon" href="data:,"><title>bundled</title>' +
    '<style>html,body{margin:0;height:100%}#plan{min-height:100%}</style></head><body><div id="plan"></div>' +
    '<script type="module" src="./app.js"></script></body></html>',
);
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".woff2": "font/woff2", ".jpg": "image/jpeg", ".png": "image/png" };
const server = createServer((r, res) => {
  const path = normalize(decodeURIComponent(new URL(r.url, "http://x").pathname)).replace(/^(\.\.[/\\])+/, "");
  const file = join(consumer, path);
  if (!file.startsWith(consumer) || !existsSync(file) || statSync(file).isDirectory()) return res.writeHead(404).end();
  res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" }).end(readFileSync(file));
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const executablePath = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
].filter(Boolean).find((p) => existsSync(p));
const browser = await req("puppeteer-core").launch({ executablePath, headless: true, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
try {
  const tab = await browser.newPage();
  await tab.setViewport({ width: 1280, height: 800 });
  const fetched = [];
  tab.on("pageerror", (err) => failures.push(`bundled consumer: page error: ${err.message}`));
  tab.on("requestfailed", (r) => failures.push(`bundled consumer: request failed: ${r.url()}`));
  tab.on("response", (res) => {
    fetched.push(res.url());
    if (res.status() >= 400) failures.push(`bundled consumer: HTTP ${res.status()}: ${res.url()}`);
  });
  await tab.goto(`http://127.0.0.1:${server.address().port}/bundled/index.html`, { waitUntil: "networkidle0" });
  try {
    await tab.waitForFunction(() => window.axonometra?.element?.shadowRoot?.querySelectorAll(".fp3d-room-chip").length > 0, { timeout: 20000 });
    ok("a bundled consumer mounts the planner through bundleUrl and opens an example plan");
  } catch {
    failures.push("bundled consumer: the planner did not mount the example plan through bundleUrl");
  }
  await new Promise((done) => setTimeout(done, 1500));
  await tab.screenshot({ path: join(shots, "bundled-consumer.png") });
  if (!fetched.some((u) => u.endsWith("/node_modules/@axonometra/editor/axonometra.js"))) failures.push("bundled consumer: axonometra.js was not loaded from bundleUrl");
  const ha = fetched.filter((u) => HOME_ASSISTANT_ONLY.some((c) => u.includes(c)));
  if (ha.length) failures.push(`bundled consumer asked for Home Assistant-only chunks: ${ha.join(", ")}`);
} finally {
  await browser.close();
  server.close();
}

// 5. three.js stays in its own chunk
const has3 = (f) => readFileSync(join(installed, f), "utf8").includes("WebGLRenderer");
for (const f of ["index.js", "axonometra.js", "plans.js"]) if (has3(f)) failures.push(`three.js is bundled into ${f}`);
if (!has3("axonometra-3d.js")) failures.push("axonometra-3d.js does not carry three.js");
else ok("three.js is only in axonometra-3d.js");

if (failures.length) {
  console.error(failures.map((f) => `FAIL ${f}`).join("\n"));
  process.exit(1);
}
console.log(`ok   npm package tested from its tarball (screenshots in ${shots})`);
