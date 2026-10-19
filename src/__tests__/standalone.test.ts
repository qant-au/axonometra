// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Axonometra stands on its own: no tracked source or doc names the network
// diagram editor it used to interoperate with, or the package it used to
// take its core from. CHANGELOG.md keeps the history. The names are
// assembled here so this file does not trip its own check.
const NAMES: { name: string; allowed: Set<string> }[] = [
  { name: ['reti', 'culyne'].join(''), allowed: new Set(['CHANGELOG.md']) },
  {
    name: ['accu', 'rona'].join(''),
    // The legacy scene format name: defined, documented, and kept in one
    // file saved before the rename, so old files are proven to open.
    allowed: new Set([
      'CHANGELOG.md',
      'src/core/scene/schema.ts',
      'docs/scene-format.md',
      'e2e/fixtures/comms-room.scene.json'
    ])
  }
];

const root = join(__dirname, '..', '..');

const files = execFileSync('git', ['ls-files', '-z'], {
  cwd: root,
  encoding: 'utf8'
})
  .split('\0')
  .filter(Boolean);

describe('standalone', () => {
  for (const { name, allowed } of NAMES) {
    it(`no tracked file mentions ${name[0].toUpperCase()}${name.slice(1)}`, () => {
      const checked = files.filter((f) => !allowed.has(f));
      expect(checked.length).toBeGreaterThan(50);
      const pattern = new RegExp(name, 'i');
      const hits = checked.filter((f) => {
        let text: string;
        try {
          text = readFileSync(join(root, f), 'utf8');
        } catch {
          return false;
        }
        return !text.includes('\0') && pattern.test(text);
      });
      expect(hits).toEqual([]);
    });
  }
});
