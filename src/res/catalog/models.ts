// 3D models of the catalogue's elements, vendored from qant-au/accurona
// (models.json). Only the 3D view imports this, so the models load with it.
import manifest from './elements/manifest.json';
import models from './elements/models.json';

/** One solid of a model, in cm: x right, y towards the front, z up. */
export type ModelPart = { z: number; h: number; colour: string } & (
  | { box: [number, number, number, number] }
  | { cyl: [number, number, number, number] }
  | { dome: [number, number, number] }
  | { poly: [number, number][] }
);

export interface ItemModel {
  /** real size of the item in cm */
  size: { w: number; d: number; h: number };
  /** drawn on plans as a fixed symbol; the model is smaller than the footprint */
  symbol: boolean;
  parts: ModelPart[];
}

const byId = new Map(
  (
    manifest.elements as {
      id: string;
      size: { w: number; d: number; h: number };
      symbol?: boolean;
    }[]
  ).map((el) => [el.id, el])
);
const partsById = models.models as unknown as Record<string, ModelPart[]>;

export function getItemModel(id: string): ItemModel | undefined {
  const el = byId.get(id);
  const parts = partsById[id];
  if (!el || !parts) return undefined;
  return { size: el.size, symbol: !!el.symbol, parts };
}
