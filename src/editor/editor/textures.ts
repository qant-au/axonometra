// The plan's images - the background pattern and the catalogue icons - as
// textures. Loaded through an <img>, never fetch(), which is what Pixi's own
// loader uses for SVG: a host's bundler may inline small images as data:
// URLs, and a Content-Security-Policy that allows data: images (img-src)
// usually still refuses to fetch them (connect-src). An <img> loads either.
//
// One cache for the page, shared by every editor on it: a texture is never
// destroyed, only dropped with the page.
import { Texture } from 'pixi.js';

const loading = new Map<string, Promise<Texture>>();
const loaded = new Map<string, Texture>();

/** The texture for an image URL, loading it the first time. */
export function loadTexture(url: string): Promise<Texture> {
  let texture = loading.get(url);
  if (!texture) {
    texture = new Promise<Texture>((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const done = Texture.from(image);
        loaded.set(url, done);
        resolve(done);
      };
      image.onerror = () => {
        loading.delete(url);
        reject(new Error(`Could not load ${url}`));
      };
      image.src = url;
    });
    loading.set(url, texture);
  }
  return texture;
}

/** The texture for an image URL if it has already loaded. */
export function loadedTexture(url: string): Texture | undefined {
  return loaded.get(url);
}
