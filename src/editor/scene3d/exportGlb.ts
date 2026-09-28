// The plan as a glTF binary (.glb): every floor, walls whole, ceilings on,
// catalogue items from their models. Built without a renderer, so it works
// for an embedding host's axo:export as well as the 3D view's button.
import { Group, Scene } from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { getItemHeights } from '../../res/catalog';
import { getItemModel } from '../../res/catalog/models';
import { METER } from '../editor/constants';
import type { FloorPlanSerializable } from '../editor/persistence/FloorPlanSerializable';
import { sceneModel } from './sceneModel';
import { buildGroup } from './threeScene';

export async function exportGlb(planText: string): Promise<ArrayBuffer> {
  const plan = JSON.parse(planText) as FloorPlanSerializable;
  const model = sceneModel(
    plan,
    { allFloors: true, current: 0, cutaway: null },
    getItemHeights,
    getItemModel
  );
  const built = buildGroup(model.prisms, { edges: false });
  // glTF is in metres with y up; the plan is in cm, and buildGroup already
  // puts height on y.
  const building = new Group();
  building.name = 'Axonometra plan';
  building.scale.setScalar(1 / METER);
  building.add(built.group);
  const scene = new Scene();
  scene.add(building);
  try {
    const out = await new GLTFExporter().parseAsync(scene, { binary: true });
    return out as ArrayBuffer;
  } finally {
    built.dispose();
  }
}
