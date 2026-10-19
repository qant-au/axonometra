// @vitest-environment node
import { expect, it } from 'vitest';
import { z } from 'zod';
import { SCENE_SCHEMA_URL, SCENE_VERSION, sceneShapeSchema } from '..';

// schema/scene-v<SCENE_VERSION>.json, published with the package: the JSON
// Schema (Draft 2020-12) generated from the Zod schema, so a scene can be
// validated in any language. Structure only: id references are checked by
// the library. After a change to the schema, regenerate it with
// `npx vitest run -u src/core` and commit the file.
it('the published JSON Schema matches the Zod schema', async () => {
  const schema = z.toJSONSchema(sceneShapeSchema, {
    target: 'draft-2020-12',
    // Refinements (url schemes, a link needing a ref or url) cannot be
    // expressed; the structure they sit on still is.
    unrepresentable: 'any'
  });
  const text =
    JSON.stringify(
      {
        $id: SCENE_SCHEMA_URL,
        title: `Axonometra scene, version ${SCENE_VERSION}`,
        ...schema
      },
      null,
      2
    ) + '\n';
  await expect(text).toMatchFileSnapshot(
    `../../../schema/scene-v${SCENE_VERSION}.json`
  );
});
