// Library builds only. Vite's library mode inlines every imported asset as a
// data: URL, whatever assetsInlineLimit says. That would put ~1 MB of help
// animations inside the code, and Pixi fetch()es its textures, which a
// strict connect-src refuses for data:. This plugin emits each imported
// image as a file beside the code instead, referenced relative to the module
// that imports it, which the host's bundler follows like any other asset.
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import type { Plugin } from 'vite';

const IMAGE = /\.(svg|gif|png)$/;

export function emitAssetsAsFiles(): Plugin {
  return {
    name: 'axonometra:emit-assets-as-files',
    enforce: 'pre',
    apply: 'build',
    async load(id) {
      const [file, query] = id.split('?');
      if (!IMAGE.test(file)) return null;
      if (query && query !== 'url') return null;
      const ref = this.emitFile({
        type: 'asset',
        name: basename(file),
        source: await readFile(file)
      });
      return `export default import.meta.ROLLUP_FILE_URL_${ref};`;
    }
  };
}
