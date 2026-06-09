import categoriesData from './categories.json';
import basicFurniture from './furniture/basic.json';
import wallFittings from './wall-fittings.json';
import type { Category, FurnitureData } from '../../stores/FurnitureStore';

const images = import.meta.glob('./images/*.svg', {
  eager: true,
  query: '?url',
  import: 'default'
}) as Record<string, string>;

export function getCategories(): Category[] {
  return categoriesData;
}

export function getFurnitureForCategory(categoryId: string): FurnitureData[] {
  if (categoryId === 'basic') return basicFurniture;
  return [];
}

export function getWindowFitting(): FurnitureData {
  return wallFittings.window;
}

export function getDoorFitting(): FurnitureData {
  return wallFittings.door;
}

export function resolveCatalogImage(imagePath: string): string {
  return (
    images[`./images/${imagePath}.svg`] ?? images['./images/placeholder.svg']
  );
}
