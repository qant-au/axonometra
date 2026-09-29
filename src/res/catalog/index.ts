// The built-in catalogue. Furniture and equipment come from the shared element
// library (qant-au/accurona), vendored into ./elements by
// scripts/sync-elements.mjs; doors and windows are still local
// (wall-fittings.json and ./images).
import manifest from './elements/manifest.json';
import wallFittings from './wall-fittings.json';
import type { Category, FurnitureData } from '../../stores/FurnitureStore';

interface ElementEntry {
  id: string;
  name: string;
  group: string;
  tags?: string[];
  /** cm: width, depth, height of the real item */
  size: { w: number; d: number; h: number };
  /** cm above the floor, for wall and ceiling gear */
  mount?: number;
  /** cm: what the item occupies on the plan (a symbol's square for small devices) */
  footprint: { w: number; d: number };
  symbol?: boolean;
}

const elements = manifest.elements as ElementEntry[];

const elementImages = import.meta.glob('./elements/plan/*.svg', {
  eager: true,
  query: '?url',
  import: 'default'
}) as Record<string, string>;

const localImages = import.meta.glob('./images/*.svg', {
  eager: true,
  query: '?url',
  import: 'default'
}) as Record<string, string>;

function toFurniture(el: ElementEntry): FurnitureData {
  return {
    _id: el.id,
    name: el.name,
    width: el.footprint.w / 100,
    height: el.footprint.d / 100,
    imagePath: el.id,
    category: el.group,
    // Wall and ceiling gear draws over floor-standing furniture.
    zIndex: el.mount ? 2 : 1,
    heightM: el.size.h / 100,
    ...(el.mount ? { mountM: el.mount / 100 } : {}),
    ...(el.tags ? { tags: el.tags } : {})
  };
}

const byGroup = new Map<string, FurnitureData[]>();
for (const el of elements) {
  const list = byGroup.get(el.group) ?? [];
  list.push(toFurniture(el));
  byGroup.set(el.group, list);
}

export function getCategories(): Category[] {
  return manifest.groups
    .filter((g) => byGroup.has(g.id))
    .map((g) => ({ _id: g.id, name: g.name, visible: true }));
}

export function getFurnitureForCategory(categoryId: string): FurnitureData[] {
  return byGroup.get(categoryId) ?? [];
}

const byId = new Map(elements.map((el) => [el.id, el]));

/** Real height and mount height in cm for a catalogue item, if it is one. */
export function getItemHeights(
  imagePath: string
): { height: number; mount: number } | undefined {
  const el = byId.get(imagePath);
  return el && { height: el.size.h, mount: el.mount ?? 0 };
}

/**
 * What an element (or a built-in door or window) is when placed with no size
 * of its own: its plan footprint and real height, cm, and its draw order.
 */
export function getPlacementDefaults(
  elementId: string
):
  | { w: number; d: number; h?: number; mount?: number; zIndex: number }
  | undefined {
  const el = byId.get(elementId);
  if (el) {
    return {
      w: el.footprint.w,
      d: el.footprint.d,
      h: el.size.h,
      ...(el.mount != null ? { mount: el.mount } : {}),
      zIndex: el.mount ? 2 : 1
    };
  }
  const fitting =
    elementId === 'door' || elementId === 'window'
      ? wallFittings[elementId]
      : undefined;
  return (
    fitting && {
      w: fitting.width * 100,
      d: fitting.height * 100,
      h: fitting.heightM * 100,
      mount: fitting.mountM * 100,
      zIndex: fitting.zIndex
    }
  );
}

/** What a placed item is called, for Find: its catalogue name, or Door / Window. */
export function getItemName(imagePath: string): string {
  const el = byId.get(imagePath);
  if (el) return el.name;
  return imagePath.charAt(0).toUpperCase() + imagePath.slice(1);
}

export function getWindowFitting(): FurnitureData {
  return wallFittings.window;
}

export function getDoorFitting(): FurnitureData {
  return wallFittings.door;
}

const SAFE_IMAGE_PATH = /^[A-Za-z0-9._-]+$/;

export function resolveCatalogImage(imagePath: string): string {
  const placeholder = localImages['./images/placeholder.svg'];
  if (!SAFE_IMAGE_PATH.test(imagePath)) return placeholder;
  return (
    elementImages[`./elements/plan/${imagePath}.svg`] ??
    localImages[`./images/${imagePath}.svg`] ??
    placeholder
  );
}

// The few local images (doors, windows, placeholder) the editor preloads.
// Element icons are loaded on first use instead; see Furniture.
export function getPreloadImageUrls(): string[] {
  return Object.values(localImages);
}

/** Every bundled catalogue image URL. */
export function getCatalogImageUrls(): string[] {
  return [...Object.values(elementImages), ...Object.values(localImages)];
}
