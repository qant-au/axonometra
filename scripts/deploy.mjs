// Copies custom_components/axonometra to a Home Assistant config folder (e.g. a Samba share).
// The target comes from AXONOMETRA_DEPLOY_TARGET or deploy.local.json ({"target": "..."}), which is
// not committed. Files in the target that no longer exist here are removed.

import { cpSync, existsSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const source = join(root, "custom_components", "axonometra");
const localConfig = join(root, "deploy.local.json");
const target = process.env.AXONOMETRA_DEPLOY_TARGET ?? (existsSync(localConfig) ? JSON.parse(readFileSync(localConfig, "utf8")).target : null);

if (!target) {
  console.error('No target. Set AXONOMETRA_DEPLOY_TARGET or create deploy.local.json with {"target": "<ha config>/custom_components/axonometra"}.');
  process.exit(1);
}
if (basename(target) !== "axonometra") {
  console.error(`Refusing to deploy: the target folder must be named axonometra (got ${target}).`);
  process.exit(1);
}

const skip = (name) => name === "__pycache__" || name.endsWith(".pyc");

function files(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (skip(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...files(full));
    else out.push(full);
  }
  return out;
}

const wanted = new Set(files(source).map((f) => relative(source, f)));
let removed = 0;
if (existsSync(target)) {
  for (const f of files(target)) {
    const rel = relative(target, f);
    if (!wanted.has(rel)) {
      rmSync(f);
      removed++;
    }
  }
}
for (const rel of wanted) cpSync(join(source, rel), join(target, rel), { force: true });
console.log(`Deployed ${wanted.size} files to ${target}${removed ? `, removed ${removed} old files` : ""}.`);
