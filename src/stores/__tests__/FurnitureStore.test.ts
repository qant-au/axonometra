import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Category, FurnitureData } from '../FurnitureStore';

const categoriesPayload: Category[] = [
  { _id: 'cat-1', name: 'Sofas', visible: true },
  { _id: 'cat-2', name: 'Tables', visible: false }
];
const furniturePayload: FurnitureData[] = [
  { _id: 'item-1', name: 'Couch', width: 2, height: 1, imagePath: 'couch.svg' }
];

const getCategoriesRequest = vi.fn(async () => ({
  json: async () => categoriesPayload
}));
const getCategoryInfo = vi.fn(async () => ({
  json: async () => furniturePayload
}));

vi.mock('../../api/api-client', () => ({
  getCategoriesRequest,
  getCategoryInfo
}));

const { useFurnitureStore } = await import('../FurnitureStore');
const initial = useFurnitureStore.getState();

describe('FurnitureStore', () => {
  beforeEach(() => {
    useFurnitureStore.setState(initial);
    getCategoriesRequest.mockClear();
    getCategoryInfo.mockClear();
  });

  it('starts with empty categories and furniture data', () => {
    const s = useFurnitureStore.getState();
    expect(s.categories).toEqual([]);
    expect(s.currentFurnitureData).toEqual([]);
  });

  it('getCategories populates categories from the API', async () => {
    await useFurnitureStore.getState().getCategories();
    expect(getCategoriesRequest).toHaveBeenCalledOnce();
    expect(useFurnitureStore.getState().categories).toEqual(categoriesPayload);
  });

  it('getCurrentFurnitureData fetches by category id', async () => {
    await useFurnitureStore.getState().getCurrentFurnitureData('cat-1');
    expect(getCategoryInfo).toHaveBeenCalledWith('cat-1');
    expect(useFurnitureStore.getState().currentFurnitureData).toEqual(
      furniturePayload
    );
  });
});
