import { describe, expect, it } from 'vitest';
import {
  emptyScene,
  validateScene,
  type PlanView,
  type Scene
} from '../../../vendor/accurona-core';
import type { FloorPlanSerializable } from '../persistence/FloorPlanSerializable';
import { newContext, planToScene, sceneToPlan } from '../persistence/sceneFile';

// A room 4 m by 3 m (cm), one diagonal interior wall, a rotated rack, a door
// flipped twice (so it carries the door's y offset) and a window.
function plan(): FloorPlanSerializable {
  return {
    version: 2,
    furnitureId: 9,
    wallNodeId: 5,
    units: 'cm',
    floors: [
      {
        wallNodes: [
          { id: 1, x: 0, y: 0 },
          { id: 2, x: 400, y: 0 },
          { id: 3, x: 400, y: 300 },
          { id: 4, x: 0, y: 300 },
          { id: 5, x: 200, y: 150 }
        ],
        wallNodeLinks: [
          [1, [2, 4]],
          [2, [3]],
          [3, [4, 5]]
        ],
        exteriorWalls: [
          [1, 2],
          [2, 3],
          [4, 1]
        ],
        wallHeightM: 2.4,
        furnitureArray: [
          {
            id: 7,
            texturePath: 'rack-600x1200-42u',
            width: 0.6,
            height: 1.2,
            x: 50,
            y: 60,
            rotation: Math.PI / 6,
            orientation: 1,
            zIndex: 1,
            heightM: 2,
            mountM: 0
          },
          {
            id: 8,
            texturePath: 'door',
            width: 0.8,
            height: 0.8,
            x: 120,
            y: -64,
            rotation: 0,
            orientation: 2,
            zIndex: 2,
            attachedToLeft: 4,
            attachedToRight: 3,
            heightM: 2.1,
            mountM: 0
          },
          {
            id: 9,
            texturePath: 'window',
            width: 1,
            height: 0.2,
            x: 100,
            y: 0,
            rotation: 0,
            orientation: 0,
            zIndex: 2,
            attachedToLeft: 2,
            attachedToRight: 3
          }
        ]
      },
      {
        wallNodes: [],
        wallNodeLinks: [],
        furnitureArray: [],
        elevationM: 3.2
      }
    ]
  };
}

// Scene lengths are kept to 0.01 mm, so to 0.001 cm here.
const near = (a: number, b: number) => expect(a).toBeCloseTo(b, 3);

describe('plan <-> scene', () => {
  it('writes a valid scene in millimetres with centred placements', () => {
    const scene = planToScene(plan(), newContext(emptyScene('s')));
    const result = validateScene(scene);
    expect(result.ok ? [] : result.errors).toEqual([]);
    const view = scene.views![0] as PlanView;
    expect(scene.units).toBe('cm');
    expect(view.floors[0].nodes![1]).toEqual({ id: '2', x: 4000, y: 0 });
    expect(view.floors[0].walls).toHaveLength(5);
    expect(view.floors[0].walls!.filter((w) => w.exterior)).toHaveLength(3);
    expect(view.floors[0].wallHeightMm).toBe(2400);
    expect(view.floors[1].elevationMm).toBe(3200);
    const rack = view.placements!.find((p) => p.object === '7')!;
    expect(rack.rotation).toBeCloseTo(30, 6);
    expect(rack.mirror).toEqual({ x: true });
    expect(rack.size).toEqual({ w: 600, d: 1200, h: 2000 });
    // Top-left (50, 60) cm plus the half-size turned 30 degrees.
    const c = Math.cos(Math.PI / 6);
    const s = Math.sin(Math.PI / 6);
    expect(rack.x).toBeCloseTo((50 + 30 * c - 60 * s) * 10, 1);
    expect(rack.y).toBeCloseTo((60 + 30 * s + 60 * c) * 10, 1);
    const door = view.placements!.find((p) => p.object === '8')!;
    expect(door.attach).toBeDefined();
    expect(door.mirror).toEqual({ x: true, y: true });
    expect(scene.objects.find((o) => o.id === '9')!.element).toBe('window');
  });

  it('reads back exactly what it wrote', () => {
    const original = plan();
    const scene = planToScene(original, newContext(emptyScene('s')));
    const { plan: back } = sceneToPlan(scene);
    expect(back.units).toBe('cm');
    expect(back.floors).toHaveLength(2);
    expect(back.floors[1].elevationM).toBe(3.2);
    const [floor] = back.floors;
    expect(floor.wallNodes.map((n) => [n.x, n.y])).toEqual(
      original.floors[0].wallNodes.map((n) => [n.x, n.y])
    );
    expect(floor.exteriorWalls).toHaveLength(3);
    for (const before of original.floors[0].furnitureArray) {
      const after = floor.furnitureArray.find(
        (f) => f.texturePath === before.texturePath
      )!;
      near(after.x, before.x);
      near(after.y, before.y);
      near(after.rotation, before.rotation);
      expect(after.orientation).toBe(before.orientation);
      expect(after.width).toBe(before.width);
      expect(after.height).toBe(before.height);
      expect(after.heightM).toBe(before.heightM);
      expect(after.mountM).toBe(before.mountM);
      expect(after.attachedToLeft != null).toBe(before.attachedToLeft != null);
    }
  });

  it('saves the scene it opened unchanged: ids are stable', () => {
    const first = planToScene(plan(), newContext(emptyScene('s')));
    const { plan: back, ctx } = sceneToPlan(first);
    const second = planToScene(back, ctx);
    expect(second).toEqual(first);
  });

  it('keeps what Axonometra does not draw', () => {
    const opened: Scene = planToScene(plan(), newContext(emptyScene('s')));
    opened.objects.find((o) => o.id === '7')!.props = { asset: 'R-01' };
    opened.objects.push({ id: 'ap', icon: 'wifi', name: 'AP' });
    opened.icons = [{ id: 'wifi', name: 'Wi-Fi', url: 'https://x.test/w.svg' }];
    opened.views!.push({
      id: 'net',
      kind: 'iso',
      name: 'Network',
      placements: [
        { object: 'ap', tile: { x: 0, y: 0 } },
        { object: '7', tile: { x: 2, y: 0 } }
      ]
    });
    (opened.views![0] as PlanView).placements!.push({
      object: 'ap',
      floor: (opened.views![0] as PlanView).floors[0].id,
      x: 1000,
      y: 1000,
      layer: 'redacted'
    });
    expect(validateScene(opened).ok).toBe(true);

    const { plan: back, ctx } = sceneToPlan(opened);
    // The icon-only AP is not drawn on the plan; delete the rack there.
    expect(back.floors[0].furnitureArray).toHaveLength(3);
    back.floors[0].furnitureArray = back.floors[0].furnitureArray.filter(
      (f) => f.texturePath !== 'rack-600x1200-42u'
    );
    const saved = planToScene(back, ctx);
    expect(validateScene(saved).ok).toBe(true);
    const rack = saved.objects.find((o) => o.id === '7');
    expect(rack?.props).toEqual({ asset: 'R-01' });
    expect(saved.views!.map((v) => v.id)).toEqual(['plan', 'net']);
    const planView = saved.views![0] as PlanView;
    expect(planView.placements!.some((p) => p.object === '7')).toBe(false);
    expect(planView.placements!.find((p) => p.object === 'ap')?.layer).toBe(
      'redacted'
    );
  });

  it('opens a hand-written scene, sizing items from the element library', () => {
    const scene: Scene = {
      format: 'accurona-scene',
      version: 1,
      id: 'comms-room',
      objects: [{ id: 'rack-1', element: 'rack-600x1200-42u' }],
      views: [
        {
          id: 'plan',
          kind: 'plan',
          name: 'Floor plan',
          floors: [{ id: 'g' }],
          placements: [{ object: 'rack-1', floor: 'g', x: 600, y: 900 }]
        }
      ]
    };
    const { plan: loaded } = sceneToPlan(scene);
    const [rack] = loaded.floors[0].furnitureArray;
    expect(rack.width).toBeGreaterThan(0);
    near(rack.x + (rack.width * 100) / 2, 60);
    near(rack.y + (rack.height * 100) / 2, 90);
  });
});
