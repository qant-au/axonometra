// The library's declarations (dist-lib/types) import the vendored Accurona
// code by relative path; tsc does not copy hand-written .d.ts files, so this
// does. Run after `tsc -p tsconfig.build.json`.
import { cpSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const from = join(root, 'src/vendor');
const to = join(root, 'dist-lib/types/vendor');

let copied = 0;
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (name.endsWith('.d.ts')) {
      cpSync(path, join(to, relative(from, path)));
      copied++;
    }
  }
};
walk(from);
console.log(`Copied ${copied} vendored declaration files to dist-lib/types/vendor`);
