// Writes src/res/catalog/elements/: manifest.json, models.json (each
// element's solids, for 3D views) and one plan SVG per element. The output is
// committed; rebuild with `npm run build:elements` after changing an element.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { GROUPS, loadElements } from '../src/index.mjs';
import { mountingErrors } from '../src/mounting.mjs';
import { footprint, planSvg } from '../src/render/plan.mjs';
import { modelOf } from '../src/render/model.mjs';

const out = new URL('../../src/res/catalog/elements/', import.meta.url);
rmSync(out, { recursive: true, force: true });
mkdirSync(new URL('plan/', out), { recursive: true });

const elements = await loadElements();
// Checked here as well as in the tests, so a bad value never reaches the output.
const invalid = elements.flatMap((el) =>
  mountingErrors(el).map((e) => `${el.id}: ${e}`)
);
if (invalid.length) {
  console.error(invalid.join('\n'));
  process.exit(1);
}
const manifest = {
  version: 1,
  groups: GROUPS,
  elements: elements.map((el) => {
    writeFileSync(new URL(`plan/${el.id}.svg`, out), planSvg(el));
    return {
      id: el.id,
      name: el.name,
      group: el.group,
      ...(el.tags?.length ? { tags: el.tags } : {}),
      size: el.size,
      ...(el.mount != null ? { mount: el.mount } : {}),
      ...(el.mountFrom ? { mountFrom: el.mountFrom } : {}),
      ...(el.facing ? { facing: el.facing } : {}),
      ...(el.surface != null ? { surface: el.surface } : {}),
      footprint: footprint(el),
      ...(el.symbol ? { symbol: true } : {})
    };
  })
};
writeFileSync(
  new URL('manifest.json', out),
  JSON.stringify(manifest, null, 2) + '\n'
);
// One line per element: small, and a diff shows which models changed.
const models = elements
  .map((el) => `    ${JSON.stringify(el.id)}: ${JSON.stringify(modelOf(el))}`)
  .join(',\n');
writeFileSync(
  new URL('models.json', out),
  `{\n  "version": 1,\n  "units": "cm; x right, y towards the front, z up",\n  "models": {\n${models}\n  }\n}\n`
);
console.log(
  `${manifest.elements.length} elements in ${GROUPS.length} groups → src/res/catalog/elements/`
);
