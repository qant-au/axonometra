import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { validateScene, type PlanView, type Scene } from '@accurona/core';

vi.mock('pixi.js', async () => {
  const { createPixiMock } = await import('../../test/pixiMock');
  return createPixiMock();
});
vi.mock('../../helpers/isMobile', () => ({ isMobile: false }));
vi.mock('@accurona/ui', () => ({
  notify: vi.fn()
}));
vi.mock('../../api/api-client', () => ({
  getDoor: () => Promise.resolve([]),
  getWindow: () => Promise.resolve([]),
  resolveCatalogImage: (id: string) => `/${id}.svg`
}));

const { Floor } = await import('../editor/objects/Floor');
const { fakeInstance } = await import('../../test/fakeInstance');
const { planToScene, sceneToPlan } =
  await import('../editor/persistence/sceneFile');
const { sceneFromFloor } = await import('../axonometric/sceneFromPlan');
const { sceneModel } = await import('../scene3d/sceneModel');
const { getItemHeights } = await import('../../res/catalog');
const { heightTag, isCeilingItem } = await import('../planLayers');

// Mount and facing, end to end (lw-112): the fixture e2e/mount-and-facing
// is one room on a 2.4 m ground floor and a 2.7 m first floor, each with a
// recessed downlight, a pendant, a dome camera, a wall TV, a table lamp on a
// bedside table and a smoke detector, all from the real element library.

const fixture = (name: string): Scene =>
  JSON.parse(
    readFileSync(resolve(__dirname, `../../../e2e/fixtures/${name}`), 'utf8')
  );

const planView = (scene: Scene) =>
  scene.views!.find((v): v is PlanView => v.kind === 'plan')!;

/** Open a scene into live Floor objects, as the editor does (Serializer). */
function open(raw: unknown) {
  const result = validateScene(raw);
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  const { plan, ctx } = sceneToPlan(result.scene);
  const floors = plan.floors.map((data) => new Floor(fakeInstance(), data));
  return { plan, ctx, floors };
}

/** Save the live floors back to a scene, as the editor does. */
function save({ plan, ctx, floors }: ReturnType<typeof open>): Scene {
  return planToScene(
    { ...plan, floors: floors.map((f) => f.serialize()) },
    ctx
  );
}

// Each item's underside and top above its floor, in cm, by object prefix.
const expected = (wall: number) => ({
  // Recessed 9 cm: the 1 cm trim below the ceiling.
  downlight: [wall - 1, wall + 9],
  pendant: [wall - 80, wall],
  dome: [wall - 10, wall],
  tv: [110, 195],
  bedside: [0, 55],
  lamp: [55, 105],
  smoke: [wall - 5, wall]
});
const CEILING = ['downlight', 'pendant', 'dome', 'smoke'];
const key = (objectId: string) => objectId.replace(/-(g|l1)$/, '');
const round = (v: number) => Math.round(v * 1e6) / 1e6;

/** The 3D view's box per item on one floor, uncut, in cm above that floor. */
function heights3d(
  opened: ReturnType<typeof open>,
  index: number
): Record<string, number[]> {
  const plan = {
    ...opened.plan,
    floors: opened.floors.map((f) => f.serialize())
  };
  const model = sceneModel(
    plan,
    { allFloors: false, current: index, cutaway: null },
    getItemHeights
  );
  const elevation = (plan.floors[index].elevationM ?? 0) * 100;
  const boxes = model.prisms.filter((p) => p.kind === 'furniture');
  const items = plan.floors[index].furnitureArray;
  expect(boxes).toHaveLength(items.length);
  return Object.fromEntries(
    items.map((item, i) => [
      key(opened.ctx.objectIds.get(item.id)!),
      [round(boxes[i].z0 - elevation), round(boxes[i].z1 - elevation)]
    ])
  );
}

/** The isometric view's underside and top per item on one floor. */
function heightsIso(opened: ReturnType<typeof open>, index: number) {
  const floor = opened.floors[index];
  const scene = sceneFromFloor(floor);
  const ids = [...floor.getFurniture().keys()];
  return Object.fromEntries(
    scene.furniture.map((f, i) => [
      key(opened.ctx.objectIds.get(ids[i])!),
      {
        span: [round(f.mount ?? 0), round((f.mount ?? 0) + (f.tall ?? 0))],
        ceiling: !!f.ceiling,
        down: !!f.facingDown
      }
    ])
  );
}

describe('mount and facing, end to end (lw-112)', () => {
  const scene = fixture('mount-and-facing.scene.json');

  it('saves and reloads identically', () => {
    const once = save(open(scene));
    const twice = save(open(once));
    expect(twice).toEqual(once);
    // Every placement keeps its reference, offset and support as written.
    const strip = (s: Scene) =>
      planView(s).placements!.map(
        ({ object, floor, mountFrom, mountMm, mountOn }) => ({
          object,
          floor,
          mountFrom,
          mountMm,
          ...(mountOn ? { mountOn } : {})
        })
      );
    expect(strip(once)).toEqual(strip(scene));
    expect(planView(once).floors.map((f) => f.wallHeightMm)).toEqual([
      2400, 2700
    ]);
  });

  it('puts each item at its height in 3D on a 2.4 m and a 2.7 m floor', () => {
    const opened = open(scene);
    expect(heights3d(opened, 0)).toEqual(expected(240));
    expect(heights3d(opened, 1)).toEqual(expected(270));
  });

  it('draws the same heights and facing in the isometric view', () => {
    const opened = open(scene);
    for (const [index, wall] of [
      [0, 240],
      [1, 270]
    ]) {
      const iso = heightsIso(opened, index);
      for (const [name, span] of Object.entries(expected(wall))) {
        expect(iso[name], name).toEqual({
          span,
          ceiling: CEILING.includes(name),
          down: ['downlight', 'dome', 'smoke'].includes(name)
        });
      }
    }
  });

  it('tags heights on the plan and puts ceiling items on the ceiling layer', () => {
    const opened = open(scene);
    const floor = opened.floors[0];
    const mm = (cm: number) => `${Math.round(cm * 10)} mm`;
    const tags = Object.fromEntries(
      [...floor.getFurniture().values()].map((item) => [
        key(opened.ctx.objectIds.get(item.getId())!),
        [
          heightTag(item, mm, item.mountOn != null ? 55 : undefined),
          isCeilingItem(item)
        ]
      ])
    );
    expect(tags).toEqual({
      downlight: ['C', true],
      pendant: ['C', true],
      dome: ['C', true],
      tv: ['+1100 mm', false],
      bedside: [null, false],
      lamp: ['+550 mm', false],
      smoke: ['C', true]
    });
  });

  it('hides ceiling items above the 1.2 m cut-away, and draws them uncut', () => {
    const opened = open(scene);
    const plan = {
      ...opened.plan,
      floors: opened.floors.map((f) => f.serialize())
    };
    for (const current of [0, 1]) {
      const cut = sceneModel(
        plan,
        { allFloors: false, current, cutaway: 120 },
        getItemHeights
      );
      // The TV crosses the cut, the table and lamp are under it.
      expect([cut.furnitureCount, cut.hiddenCount]).toEqual([3, 4]);
      const outlined = sceneModel(
        plan,
        { allFloors: false, current, cutaway: 120, above: true },
        getItemHeights
      );
      expect(outlined.hiddenCount).toBe(4);
      expect(
        outlined.prisms.filter((p) => p.kind === 'furniture').length
      ).toBeGreaterThan(
        cut.prisms.filter((p) => p.kind === 'furniture').length
      );
      const whole = sceneModel(
        plan,
        { allFloors: false, current, cutaway: null },
        getItemHeights
      );
      expect([whole.furnitureCount, whole.hiddenCount]).toEqual([7, 0]);
    }
  });

  it('moves only the ceiling items when a floor’s wall height changes', () => {
    const opened = open(scene);
    const before = heights3d(opened, 0);
    opened.floors[0].wallHeightM = 2.55;
    const after = heights3d(opened, 0);
    for (const name of Object.keys(before)) {
      const shift = CEILING.includes(name) ? 15 : 0;
      expect(after[name], name).toEqual(before[name].map((v) => v + shift));
    }
    // And it is saved as a wall height, the items still by reference.
    const saved = planView(save(opened));
    expect(saved.floors[0].wallHeightMm).toBe(2550);
    expect(
      saved.placements!.find((p) => p.object === 'pendant-g')
    ).toMatchObject({ mountFrom: 'ceiling', mountMm: 0 });
  });

  it('opens an old (version 1) scene with every item where it was', () => {
    const old = fixture('comms-room.scene.json');
    expect(old.version).toBe(1);
    const saved = save(open(old));
    expect(saved.version).toBe(2);
    const before = planView(old).placements!;
    const after = new Map(
      planView(saved).placements!.map((p) => [p.object, p])
    );
    for (const p of before) {
      const q = after.get(p.object)!;
      expect([q.x, q.y, q.rotation ?? 0]).toEqual([p.x, p.y, p.rotation ?? 0]);
      if (p.mountMm != null) {
        expect(q).toMatchObject({ mountFrom: 'floor', mountMm: p.mountMm });
      }
    }
  });
});
