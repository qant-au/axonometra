import { useStore as useZustand } from 'zustand';
import { createStore, type StoreApi } from 'zustand/vanilla';
import { useInstance } from '../editor/instance/context';
import { getCategoriesRequest, getCategoryInfo } from '../api/api-client';

export interface Category {
  _id: string;
  name: string;
  visible: boolean;
}

export interface FurnitureData {
  _id?: string;
  name?: string;
  width: number;
  height: number;
  imagePath: string;
  category?: string;
  zIndex?: number;
  /** How tall the item is, in metres (`height` is its depth on the plan). */
  heightM?: number;
  /** Height of the item's base above the floor, in metres. */
  mountM?: number;
  /** Kinds of equipment: network, power, cooling, security, fire, av. */
  tags?: string[];
}

export interface FurnitureStore {
  categories: Category[];
  currentFurnitureData: FurnitureData[];
  getCategories: () => void;
  getCurrentFurnitureData: (categoryId: string) => void;
}

export function createFurnitureStore(): StoreApi<FurnitureStore> {
  return createStore<FurnitureStore>()((set) => ({
    categories: [],
    currentFurnitureData: [],
    getCategories: async () => {
      const res = await (await getCategoriesRequest()).json();
      set(() => ({
        categories: res
      }));
    },
    getCurrentFurnitureData: async (categoryId: string) => {
      const res = await (await getCategoryInfo(categoryId)).json();
      set(() => ({
        currentFurnitureData: res
      }));
    }
  }));
}

export function useFurnitureStore<T>(
  selector: (state: FurnitureStore) => T
): T {
  return useZustand(useInstance().furniture, selector);
}
