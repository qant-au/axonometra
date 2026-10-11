// Reads the live floor plan into the plain data axonometric.ts projects.
import { getItemHeights } from '../../res/catalog';
import type { EditorInstance } from '../instance/EditorInstance';
import type { Floor } from '../editor/objects/Floor';
import type { Wall } from '../editor/objects/Walls/Wall';
import { METER, WALL_HEIGHT } from '../editor/constants';
import { resolveMount } from '../mount';
import type { IFurnitureSerializable } from '../editor/persistence/IFurnitureSerializable';
import { SceneFloor, SceneWall } from './axonometric';

function sceneWall(wall: Wall): SceneWall {
  return {
    a: { x: wall.leftNode.x, y: wall.leftNode.y },
    b: { x: wall.rightNode.x, y: wall.rightNode.y },
    thickness: wall.thickness
  };
}

// An item's own saved heights (plan format v2, metres) win; a v1 plan's items
// fall back to the catalogue (cm, which is also the plan unit, METER = 100).
// A ceiling item hangs from this floor's wall height, so it follows it.
function heights(data: IFurnitureSerializable, wallHeight: number) {
  const catalogue = getItemHeights(data.texturePath);
  const tall = data.heightM != null ? data.heightM * METER : catalogue?.height;
  const offset = data.mountM != null ? data.mountM * METER : undefined;
  const mount =
    offset == null && data.mountFrom == null && !catalogue
      ? undefined
      : resolveMount(
          { mountFrom: data.mountFrom, offset },
          catalogue,
          wallHeight,
          tall ?? 0
        );
  return {
    ...(tall != null ? { tall } : {}),
    ...(mount != null ? { mount } : {})
  };
}

export function sceneFromFloor(floor: Floor): SceneFloor {
  const seq = floor.getWallNodeSequence();
  const walls = new Map<Wall, SceneWall>();
  for (const wall of seq.getWalls()) walls.set(wall, sceneWall(wall));
  const wallHeight =
    floor.wallHeightM != null ? floor.wallHeightM * METER : WALL_HEIGHT;

  const furniture = [...floor.getFurniture().values()].map((item) => {
    const data = item.serialize();
    const wall =
      data.attachedToLeft != null && data.attachedToRight != null
        ? seq.getWall(data.attachedToLeft, data.attachedToRight)
        : null;
    return {
      kind: data.texturePath,
      x: data.x,
      y: data.y,
      width: data.width,
      height: data.height,
      rotation: data.rotation,
      ...heights(data, wallHeight),
      wall: wall ? walls.get(wall) : undefined
    };
  });

  return {
    walls: [...walls.values()],
    furniture,
    ...(floor.wallHeightM != null
      ? { wallHeight: floor.wallHeightM * METER }
      : {}),
    ...(floor.elevationM != null ? { elevation: floor.elevationM * METER } : {})
  };
}

/** Every floor, lowest first, and the index of the one being edited. */
export function sceneFromPlan(inst: EditorInstance): {
  floors: SceneFloor[];
  current: number;
} {
  const { floors, currentFloor } = inst.plan.getState();
  return {
    floors: floors.filter(Boolean).map(sceneFromFloor),
    current: currentFloor
  };
}
