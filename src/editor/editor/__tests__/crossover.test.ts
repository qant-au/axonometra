import { describe, expect, it } from 'vitest';
import { validateScene, type Scene } from '@accurona/core';
import { objectPlaces, placedOnlyElsewhere } from '../persistence/crossover';
import { planToScene, sceneToPlan } from '../persistence/sceneFile';

// An access point in a network diagram, placed on the floor plan from
// Axonometra, stays one scene object with the diagram's id.

function scene(): Scene {
  return {
    format: 'accurona-scene',
    version: 1,
    id: 'hq',
    objects: [
      { id: 'desk', element: 'desk-1600x800' },
      {
        id: 'ap-2e',
        element: 'wifi-ap',
        name: 'AP level 2 east',
        props: { ip: '10.0.20.14' }
      },
      { id: 'cloud', name: 'Cloud' }
    ],
    views: [
      {
        id: 'plan',
        kind: 'plan',
        name: 'Building',
        floors: [{ id: 'l2', name: 'Level 2' }],
        placements: [{ object: 'desk', floor: 'l2', x: 1000, y: 1000 }]
      },
      {
        id: 'net',
        kind: 'schematic',
        name: 'Level 2 network',
        placements: [
          { object: 'ap-2e', tile: { x: 0, y: 0 } },
          { object: 'cloud', tile: { x: 2, y: 0 } }
        ]
      }
    ]
  };
}

describe('crossover', () => {
  it('offers what is in a diagram and not on the plan', () => {
    expect(placedOnlyElsewhere(scene(), ['plan']).map((o) => o.id)).toEqual([
      'ap-2e',
      'cloud'
    ]);
  });

  it('says where an object is drawn', () => {
    expect(objectPlaces(scene(), 'ap-2e')).toEqual([
      {
        viewId: 'net',
        viewName: 'Level 2 network',
        kind: 'schematic',
        tile: { x: 0, y: 0 }
      }
    ]);
  });

  it('saves a device placed from the diagram as the same object', () => {
    const { plan, ctx } = sceneToPlan(scene());
    // What placing it from "From the network diagram" does: a new item,
    // linked to the object before the save.
    const id = plan.furnitureId + 1;
    plan.furnitureId = id;
    plan.floors[0].furnitureArray.push({
      id,
      texturePath: 'wifi-ap',
      width: 0.4,
      height: 0.4,
      x: 500,
      y: 500,
      rotation: 0,
      orientation: 0,
      zIndex: 2
    });
    ctx.objectIds.set(id, 'ap-2e');

    const saved = planToScene(plan, ctx);
    const result = validateScene(saved);
    expect(result.ok ? [] : result.errors).toEqual([]);
    expect(saved.objects.filter((o) => o.id === 'ap-2e')).toEqual([
      {
        id: 'ap-2e',
        element: 'wifi-ap',
        name: 'AP level 2 east',
        props: { ip: '10.0.20.14' }
      }
    ]);
    expect(objectPlaces(saved, 'ap-2e').map((p) => p.viewId)).toEqual([
      'plan',
      'net'
    ]);
    expect(placedOnlyElsewhere(saved, ['plan']).map((o) => o.id)).toEqual([
      'cloud'
    ]);
  });
});
