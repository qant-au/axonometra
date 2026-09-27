// Reads the live floor plan into the plain data axonometric.ts projects.
// Live floors rather than the serialized plan, because a wall's exterior
// flag (and so its thickness) is not part of the saved format.
import { useFloorPlanStore } from '../../stores/FloorPlanStore';
import type { Floor } from '../editor/objects/Floor';
import type { Wall } from '../editor/objects/Walls/Wall';
import { SceneFloor, SceneWall } from './axonometric';

function sceneWall(wall: Wall): SceneWall {
  return {
    a: { x: wall.leftNode.x, y: wall.leftNode.y },
    b: { x: wall.rightNode.x, y: wall.rightNode.y },
    thickness: wall.thickness
  };
}

export function sceneFromFloor(floor: Floor): SceneFloor {
  const seq = floor.getWallNodeSequence();
  const walls = new Map<Wall, SceneWall>();
  for (const wall of seq.getWalls()) walls.set(wall, sceneWall(wall));

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
      wall: wall ? walls.get(wall) : undefined
    };
  });

  return { walls: [...walls.values()], furniture };
}

/** Every floor, lowest first, and the index of the one being edited. */
export function sceneFromPlan(): { floors: SceneFloor[]; current: number } {
  const { floors, currentFloor } = useFloorPlanStore.getState();
  return {
    floors: floors.filter(Boolean).map(sceneFromFloor),
    current: currentFloor
  };
}
