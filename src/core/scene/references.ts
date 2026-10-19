import type { DiagramView, PlanView, Scene } from './schema';

// Every id reference in a scene must resolve, every id must be unique in its
// collection, no object is placed twice in a view, and groups do not nest in
// a cycle (docs/scene-format.md, Validation).

export interface ReferenceIssue {
  message: string;
  path: (string | number)[];
}

const REDACTED = 'redacted';

export function checkReferences(scene: Scene): ReferenceIssue[] {
  const issues: ReferenceIssue[] = [];
  const add = (message: string, path: (string | number)[]) =>
    issues.push({ message, path });

  const unique = (
    items: readonly { id: string }[] | undefined,
    what: string,
    path: (string | number)[]
  ): Set<string> => {
    const seen = new Set<string>();
    (items ?? []).forEach((item, i) => {
      if (seen.has(item.id))
        add(`Duplicate ${what} id "${item.id}"`, [...path, i, 'id']);
      seen.add(item.id);
    });
    return seen;
  };

  unique(scene.objects, 'object', ['objects']);
  const iconIds = unique(scene.icons, 'icon', ['icons']);
  const colorIds = unique(scene.colors, 'colour', ['colors']);
  const layerIds = unique(scene.layers, 'layer', ['layers']);
  unique(scene.connections, 'connection', ['connections']);
  unique(scene.views, 'view', ['views']);
  if (layerIds.has(REDACTED)) {
    add('"redacted" is reserved and never listed', ['layers']);
  }

  const objects = new Map(scene.objects.map((o) => [o.id, o]));
  const ports = new Map(
    scene.objects.map((o) => [o.id, new Set((o.ports ?? []).map((p) => p.id))])
  );

  scene.objects.forEach((o, i) => {
    unique(o.ports, 'port', ['objects', i, 'ports']);
    if (o.icon !== undefined && !iconIds.has(o.icon)) {
      add(`Unknown icon "${o.icon}"`, ['objects', i, 'icon']);
    }
  });

  const layerOk = (layer: string | undefined) =>
    layer === undefined || layer === REDACTED || layerIds.has(layer);
  const checkLayer = (layer: string | undefined, path: (string | number)[]) => {
    if (!layerOk(layer)) add(`Unknown layer "${layer}"`, [...path, 'layer']);
  };

  const connections = new Map((scene.connections ?? []).map((c) => [c.id, c]));
  (scene.connections ?? []).forEach((c, i) => {
    const path = ['connections', i];
    for (const [end, port] of [
      ['from', 'fromPort'],
      ['to', 'toPort']
    ] as const) {
      const objectId = c[end];
      if (!objects.has(objectId)) {
        add(`Unknown object "${objectId}"`, [...path, end]);
      } else if (c[port] !== undefined && !ports.get(objectId)!.has(c[port]!)) {
        add(`Object "${objectId}" has no port "${c[port]}"`, [...path, port]);
      }
    }
  });

  (scene.views ?? []).forEach((view, v) => {
    const path = ['views', v];
    if (view.kind === 'plan') checkPlan(view, path);
    else checkDiagram(view, path);
  });

  function checkPlacedOnce(
    placements: readonly { object: string }[] | undefined,
    path: (string | number)[]
  ): Set<string> {
    const placed = new Set<string>();
    (placements ?? []).forEach((p, i) => {
      if (!objects.has(p.object)) {
        add(`Unknown object "${p.object}"`, [...path, i, 'object']);
      }
      if (placed.has(p.object)) {
        add(`Object "${p.object}" is placed twice in one view`, [
          ...path,
          i,
          'object'
        ]);
      }
      placed.add(p.object);
    });
    return placed;
  }

  function checkPlan(view: PlanView, path: (string | number)[]) {
    unique(view.floors, 'floor', [...path, 'floors']);
    const wallsByFloor = new Map<string, Set<string>>();
    view.floors.forEach((floor, f) => {
      const fPath = [...path, 'floors', f];
      const nodes = unique(floor.nodes, 'node', [...fPath, 'nodes']);
      const walls = unique(floor.walls, 'wall', [...fPath, 'walls']);
      wallsByFloor.set(floor.id, walls);
      (floor.walls ?? []).forEach((wall, w) => {
        for (const end of ['from', 'to'] as const) {
          if (!nodes.has(wall[end])) {
            add(`Unknown node "${wall[end]}"`, [...fPath, 'walls', w, end]);
          }
        }
        checkLayer(wall.layer, [...fPath, 'walls', w]);
      });
    });
    checkPlacedOnce(view.placements, [...path, 'placements']);
    (view.placements ?? []).forEach((p, i) => {
      const pPath = [...path, 'placements', i];
      const walls = wallsByFloor.get(p.floor);
      if (!walls) add(`Unknown floor "${p.floor}"`, [...pPath, 'floor']);
      else if (p.attach && !walls.has(p.attach.wall)) {
        add(`Unknown wall "${p.attach.wall}" on floor "${p.floor}"`, [
          ...pPath,
          'attach',
          'wall'
        ]);
      }
      checkLayer(p.layer, pPath);
    });

    // 'surface' stands on another object placed on the same floor of this
    // view, never in a cycle; mountOn means nothing with any other mountFrom.
    const floorOf = new Map(
      (view.placements ?? []).map((p) => [p.object, p.floor])
    );
    const support = new Map(
      (view.placements ?? []).map((p) => [p.object, p.mountOn])
    );
    (view.placements ?? []).forEach((p, i) => {
      const pPath = [...path, 'placements', i];
      if (p.mountFrom === 'surface' && p.mountOn === undefined) {
        add('A surface mount needs mountOn', [...pPath, 'mountOn']);
        return;
      }
      if (p.mountOn === undefined) return;
      if (p.mountFrom !== 'surface') {
        add('mountOn is only for mountFrom "surface"', [...pPath, 'mountOn']);
        return;
      }
      if (floorOf.get(p.mountOn) !== p.floor) {
        add(`Object "${p.mountOn}" is not placed on floor "${p.floor}"`, [
          ...pPath,
          'mountOn'
        ]);
        return;
      }
      const seen = new Set<string>([p.object]);
      let next: string | undefined = p.mountOn;
      while (next !== undefined) {
        if (seen.has(next)) {
          add(`Object "${p.object}" stands on itself`, [...pPath, 'mountOn']);
          break;
        }
        seen.add(next);
        next = support.get(next);
      }
    });
  }

  function checkDiagram(view: DiagramView, path: (string | number)[]) {
    const groups = unique(view.groups, 'group', [...path, 'groups']);
    const groupOk = (g: string | undefined, p: (string | number)[]) => {
      if (g !== undefined && !groups.has(g))
        add(`Unknown group "${g}"`, [...p, 'group']);
    };
    const placed = checkPlacedOnce(view.placements, [...path, 'placements']);
    (view.placements ?? []).forEach((p, i) => {
      groupOk(p.group, [...path, 'placements', i]);
      checkLayer(p.layer, [...path, 'placements', i]);
    });
    unique(view.connectors, 'connector', [...path, 'connectors']);
    unique(view.rectangles, 'rectangle', [...path, 'rectangles']);
    unique(view.textBoxes, 'text box', [...path, 'textBoxes']);

    const anchorIds = new Set<string>();
    (view.connectors ?? []).forEach((c, ci) => {
      c.anchors.forEach((a, ai) => {
        if (anchorIds.has(a.id)) {
          add(`Duplicate anchor id "${a.id}"`, [
            ...path,
            'connectors',
            ci,
            'anchors',
            ai,
            'id'
          ]);
        }
        anchorIds.add(a.id);
      });
    });
    (view.connectors ?? []).forEach((c, ci) => {
      const cPath = [...path, 'connectors', ci];
      c.anchors.forEach((a, ai) => {
        const ref = a.ref;
        if ('object' in ref && !placed.has(ref.object)) {
          add(`Object "${ref.object}" is not placed in this view`, [
            ...cPath,
            'anchors',
            ai,
            'ref'
          ]);
        }
        if (
          'anchor' in ref &&
          (!anchorIds.has(ref.anchor) || ref.anchor === a.id)
        ) {
          add(`Unknown anchor "${ref.anchor}"`, [
            ...cPath,
            'anchors',
            ai,
            'ref'
          ]);
        }
      });
      if (c.color !== undefined && !colorIds.has(c.color)) {
        add(`Unknown colour "${c.color}"`, [...cPath, 'color']);
      }
      checkLayer(c.layer, cPath);
      if (c.connection !== undefined) {
        const conn = connections.get(c.connection);
        if (!conn) {
          add(`Unknown connection "${c.connection}"`, [...cPath, 'connection']);
        } else {
          const first = c.anchors[0].ref;
          const last = c.anchors[c.anchors.length - 1].ref;
          const ends = [
            'object' in first ? first.object : undefined,
            'object' in last ? last.object : undefined
          ];
          const matches =
            (ends[0] === conn.from && ends[1] === conn.to) ||
            (ends[0] === conn.to && ends[1] === conn.from);
          if (!matches) {
            add(`Connector ends do not match connection "${c.connection}"`, [
              ...cPath,
              'connection'
            ]);
          }
        }
      }
    });
    (view.rectangles ?? []).forEach((r, i) => {
      const rPath = [...path, 'rectangles', i];
      if (r.color !== undefined && !colorIds.has(r.color)) {
        add(`Unknown colour "${r.color}"`, [...rPath, 'color']);
      }
      groupOk(r.group, rPath);
      checkLayer(r.layer, rPath);
    });
    (view.textBoxes ?? []).forEach((t, i) => {
      groupOk(t.group, [...path, 'textBoxes', i]);
      checkLayer(t.layer, [...path, 'textBoxes', i]);
    });

    // Groups nest; a cycle is invalid.
    const parent = new Map((view.groups ?? []).map((g) => [g.id, g.group]));
    (view.groups ?? []).forEach((g, i) => {
      groupOk(g.group, [...path, 'groups', i]);
      const seen = new Set<string>([g.id]);
      let next = g.group;
      while (next !== undefined) {
        if (seen.has(next)) {
          add(`Group "${g.id}" is inside itself`, [
            ...path,
            'groups',
            i,
            'group'
          ]);
          break;
        }
        seen.add(next);
        next = parent.get(next);
      }
    });
  }

  return issues;
}
