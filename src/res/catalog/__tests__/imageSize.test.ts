import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// The plan uploads its images to WebGL straight from an <img>
// (editor/textures.ts). Chrome refuses an SVG with no intrinsic size there
// ("texImage2D: bad image data") and the sprite draws solid black, which is
// how doors and windows shipped as black shapes. Every SVG the plan draws
// must say how big it is.
const root = resolve(__dirname, '../../../..');
const dirs = [
  resolve(root, 'src/res/catalog/images'),
  resolve(root, 'node_modules/@accurona/elements/dist/plan')
];

function rootTag(svg: string): string {
  return /<svg\b[^>]*>/.exec(svg)?.[0] ?? '';
}

describe('plan images', () => {
  const files = dirs.flatMap((dir) =>
    readdirSync(dir)
      .filter((f) => f.endsWith('.svg'))
      .map((f) => resolve(dir, f))
  );

  it('finds the images', () => {
    expect(files.length).toBeGreaterThan(100);
  });

  it.each([...files, resolve(root, 'src/res/pattern.svg')])(
    '%s has an intrinsic width and height',
    (file) => {
      const tag = rootTag(readFileSync(file, 'utf8'));
      expect(tag).toMatch(/\swidth="\d/);
      expect(tag).toMatch(/\sheight="\d/);
    }
  );
});
