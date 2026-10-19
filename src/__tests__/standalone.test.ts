// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Axonometra stands on its own: no tracked source or doc names the network
// diagram editor it used to interoperate with. CHANGELOG.md keeps the history.
// The name is assembled here so this file does not trip its own check.
const NAME = ['reti', 'culyne'].join('');
const ALLOWED = new Set(['CHANGELOG.md']);

const root = join(__dirname, '..', '..');

describe('standalone', () => {
  it(`no tracked file mentions ${NAME[0].toUpperCase()}${NAME.slice(1)}`, () => {
    const files = execFileSync('git', ['ls-files', '-z'], {
      cwd: root,
      encoding: 'utf8'
    })
      .split('\0')
      .filter((f) => f && !ALLOWED.has(f));
    expect(files.length).toBeGreaterThan(50);
    const pattern = new RegExp(NAME, 'i');
    const hits = files.filter((f) => {
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
});
