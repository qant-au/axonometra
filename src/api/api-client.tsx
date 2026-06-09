import {
  getCategories,
  getDoorFitting,
  getFurnitureForCategory,
  getWindowFitting,
  resolveCatalogImage
} from '../res/catalog';
import type { Category, FurnitureData } from '../stores/FurnitureStore';

// Callers use `await (await fn()).json()`. We preserve that shape so consumers
// don't change, even though the data is now a synchronous local lookup.
function asResponse<T>(data: T) {
  return Promise.resolve({ json: () => Promise.resolve(data) });
}

export function getCategoriesRequest(): Promise<{
  json: () => Promise<Category[]>;
}> {
  return asResponse(getCategories());
}

export function getCategoryInfo(
  categoryId: string
): Promise<{ json: () => Promise<FurnitureData[]> }> {
  return asResponse(getFurnitureForCategory(categoryId));
}

export async function getWindow(): Promise<FurnitureData[]> {
  return [getWindowFitting()];
}

export async function getDoor(): Promise<FurnitureData[]> {
  return [getDoorFitting()];
}

export { resolveCatalogImage };
