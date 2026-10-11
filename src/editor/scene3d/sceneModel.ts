// What the 3D view draws, as plain prisms: every shown floor's wall pieces and
// slabs (geometry.ts) plus its free-standing furniture as boxes at their real
// heights. Built from the saved plan, so it sees exactly what a save would.
import { furnitureFootprint } from '../axonometric/axonometric';
import { METER } from '../editor/constants';
import type { FloorPlanSerializable } from '../editor/persistence/FloorPlanSerializable';
import { floorInput } from './fromPlan';
import { floorGeometry, type Prism } from './geometry';
import type { ItemModel } from '../../res/catalog/models';
import { cutAt, placeModel } from './placeModel';
import { resolveMount, type CatalogueHeights } from '../mount';
import { mountedOf, supportTopOf, surfaceTops } from '../surfaces';

/** Height of a free-standing item with no recorded or catalogue height. */
const DEFAULT_ITEM_HEIGHT = 0.7 * METER;

export interface SceneOptions {
  /** show every floor stacked, or only `current` */
  allFloors: boolean;
  current: number;
  /**
   * Cut walls off this far above each floor, dollhouse style, and leave the
   * ceilings off so the rooms can be seen into. null draws them whole.
   */
  cutaway: number | null;
  /**
   * Draw what is above the cut-away (ceiling items, most wall gear) as faint
   * outlines at its true height, instead of leaving it out.
   */
  above?: boolean;
}

/** Real height and mount in plan units (cm) for a catalogue id. */
export type HeightLookup = (id: string) => CatalogueHeights | undefined;

/** A catalogue item's 3D model, if it has one. */
export type ModelLookup = (id: string) => ItemModel | undefined;

export interface SceneModel {
  prisms: Prism[];
  /** plan-unit box around everything drawn, for framing the camera */
  bounds: { min: [number, number, number]; max: [number, number, number] };
  wallCount: number;
  furnitureCount: number;
  /**
   * items that hang wholly above the cut-away: outlines when `above`, else
   * left out
   */
  hiddenCount: number;
}

export function sceneModel(
  plan: FloorPlanSerializable,
  options: SceneOptions,
  lookup: HeightLookup,
  models: ModelLookup = () => undefined
): SceneModel {
  const indices = options.allFloors
    ? plan.floors.map((_, i) => i)
    : [options.current].filter((i) => i >= 0 && i < plan.floors.length);
  const top = indices[indices.length - 1];
  const above = !!options.above;
  const prisms: Prism[] = [];
  let wallCount = 0;
  let furnitureCount = 0;
  let hiddenCount = 0;

  for (const index of indices) {
    const floor = plan.floors[index];
    const input = floorInput(floor, index);
    const geometry = floorGeometry(input);
    wallCount += input.walls.length;
    const cut =
      options.cutaway == null ? null : input.elevation + options.cutaway;

    for (const piece of geometry.walls) {
      if (cut == null) {
        prisms.push(piece);
      } else if (piece.z0 < cut) {
        prisms.push({ ...piece, z1: Math.min(piece.z1, cut) });
      }
    }
    prisms.push(...geometry.floors);
    // A ceiling under another shown floor would sit on that floor's slab, and
    // a cut-away view leaves them off so the rooms can be seen into.
    if (cut == null && index === top) prisms.push(...geometry.ceilings);

    const tops = surfaceTops(
      floor.furnitureArray.map(mountedOf),
      input.wallHeight,
      lookup
    );
    for (const item of floor.furnitureArray) {
      // Doors and windows are openings in their walls, already cut out.
      if (item.attachedToLeft != null && item.attachedToRight != null) continue;
      const catalogue = lookup(item.texturePath);
      const tall =
        item.heightM != null
          ? item.heightM * METER
          : (catalogue?.height ?? DEFAULT_ITEM_HEIGHT);
      const mount = resolveMount(
        {
          mountFrom: item.mountFrom,
          offset: item.mountM != null ? item.mountM * METER : undefined
        },
        catalogue,
        input.wallHeight,
        tall,
        supportTopOf(mountedOf(item), tops)
      );
      const z0 = input.elevation + mount;
      // Hangs above the cut: an outline or left out, but counted either way,
      // so the description does not claim the item is not there.
      if (cut != null && z0 >= cut) {
        hiddenCount++;
        if (!above) continue;
      } else {
        furnitureCount++;
      }
      const model = models(item.texturePath);
      if (model) {
        // The models are drawn as their element is installed; an item set
        // the other way up is turned over inside its height.
        const flip =
          item.facing != null && item.facing !== (catalogue?.facing ?? 'up');
        prisms.push(...placeModel(item, model, z0, tall, cut, { flip, above }));
        continue;
      }
      // No model: a box of the item's footprint and height.
      prisms.push(
        ...cutAt(
          {
            kind: 'furniture',
            footprint: furnitureFootprint({
              kind: item.texturePath,
              x: item.x,
              y: item.y,
              width: item.width,
              height: item.height,
              rotation: item.rotation
            }),
            z0,
            z1: z0 + tall
          },
          cut,
          above
        )
      );
    }
  }

  return {
    prisms,
    bounds: boundsOf(prisms),
    wallCount,
    furnitureCount,
    hiddenCount
  };
}

function boundsOf(prisms: Prism[]): SceneModel['bounds'] {
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (const p of prisms) {
    for (const q of p.footprint) {
      min[0] = Math.min(min[0], q.x);
      max[0] = Math.max(max[0], q.x);
      min[1] = Math.min(min[1], q.y);
      max[1] = Math.max(max[1], q.y);
    }
    min[2] = Math.min(min[2], p.z0);
    max[2] = Math.max(max[2], p.z1);
  }
  if (!prisms.length) return { min: [0, 0, 0], max: [0, 0, 0] };
  return { min, max };
}
