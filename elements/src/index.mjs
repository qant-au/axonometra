// Every element, in group order, from src/elements/<group>.mjs.
import { readdirSync } from 'node:fs';
import { GROUPS } from './groups.mjs';

const dir = new URL('./elements/', import.meta.url);

export async function loadElements() {
  const files = readdirSync(dir).filter((f) => f.endsWith('.mjs'));
  const all = [];
  for (const file of files) {
    const mod = await import(new URL(file, dir));
    all.push(...mod.default);
  }
  const rank = new Map(GROUPS.map((g, i) => [g.id, i]));
  // Stable within a group: the order the file lists them in.
  return all
    .map((el, i) => ({ el, i }))
    .sort(
      (a, b) =>
        (rank.get(a.el.group) ?? 99) - (rank.get(b.el.group) ?? 99) || a.i - b.i
    )
    .map(({ el }) => el);
}

export { GROUPS };
