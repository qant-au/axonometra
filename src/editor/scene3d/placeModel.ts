// Puts a catalogue item's 3D model where the item stands on the plan: scaled
// to its footprint, mirrored as the editor mirrors its icon, turned by its
// rotation, and raised to its mount height. The result is prisms, like the
// rest of the scene.
import type { ItemModel, ModelPart } from '../../res/catalog/models';
import { METER } from '../editor/constants';
import type { IFurnitureSerializable } from '../editor/persistence/IFurnitureSerializable';
import type { Point, Prism } from './geometry';

/** Round parts are drawn as polygons with this many sides. */
const SIDES = 24;

function ellipse(cx: number, cy: number, rx: number, ry: number): Point[] {
  return Array.from({ length: SIDES }, (_, i) => {
    const t = (2 * Math.PI * i) / SIDES;
    return { x: cx + rx * Math.cos(t), y: cy + ry * Math.sin(t) };
  });
}

/** A part as plan polygons with heights in model cm (a dome becomes a few steps). */
function shapes(part: ModelPart): { poly: Point[]; z0: number; z1: number }[] {
  const { z, h } = part;
  if ('box' in part) {
    const [x, y, w, d] = part.box;
    const poly = [
      { x, y },
      { x: x + w, y },
      { x: x + w, y: y + d },
      { x, y: y + d }
    ];
    return [{ poly, z0: z, z1: z + h }];
  }
  if ('cyl' in part) {
    const [cx, cy, rx, ry] = part.cyl;
    return [{ poly: ellipse(cx, cy, rx, ry), z0: z, z1: z + h }];
  }
  if ('poly' in part) {
    return [{ poly: part.poly.map(([x, y]) => ({ x, y })), z0: z, z1: z + h }];
  }
  // A dome as three stepped discs, narrowing towards the top.
  const [cx, cy, r] = part.dome;
  return [1, 0.8, 0.5].map((k, i) => ({
    poly: ellipse(cx, cy, r * k, r * k),
    z0: z + (h * i) / 3,
    z1: z + (h * (i + 1)) / 3
  }));
}

/**
 * The item's model as prisms. `base` is the floor's elevation plus the item's
 * mount height; `tall` its height, to which the model is scaled. Parts above
 * `cut` are left out and parts crossing it are cut off.
 */
export function placeModel(
  item: IFurnitureSerializable,
  model: ItemModel,
  base: number,
  tall: number,
  cut: number | null
): Prism[] {
  const W = item.width * METER;
  const D = item.height * METER;
  const { size } = model;
  // A symbol's footprint is a fixed square larger than the device, so the
  // device sits at its real size in the middle; anything else fills it.
  const kx = model.symbol ? 1 : W / size.w;
  const ky = model.symbol ? 1 : D / size.d;
  const ox = model.symbol ? (W - size.w) / 2 : 0;
  const oy = model.symbol ? (D - size.d) / 2 : 0;
  const kz = size.h ? tall / size.h : 1;
  // The editor flips an item's icon through four orientations: 1 mirrors it
  // across, 2 across and down, 3 down only.
  const o = item.orientation ?? 0;
  const mirrorX = o === 1 || o === 2;
  const mirrorY = o === 2 || o === 3;
  const cos = Math.cos(item.rotation);
  const sin = Math.sin(item.rotation);
  const place = (p: Point): Point => {
    let sx = ox + p.x * kx;
    let sy = oy + p.y * ky;
    if (mirrorX) sx = W - sx;
    if (mirrorY) sy = D - sy;
    return { x: item.x + sx * cos - sy * sin, y: item.y + sx * sin + sy * cos };
  };

  const out: Prism[] = [];
  for (const part of model.parts) {
    for (const s of shapes(part)) {
      const z0 = base + s.z0 * kz;
      let z1 = base + s.z1 * kz;
      if (cut != null) {
        if (z0 >= cut) continue;
        z1 = Math.min(z1, cut);
      }
      out.push({
        kind: 'furniture',
        footprint: s.poly.map(place),
        z0,
        z1,
        colour: part.colour
      });
    }
  }
  return out;
}
