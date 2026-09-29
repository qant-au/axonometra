# Axonometra plan file format

This document describes the JSON shape that `Save` (Ctrl+S) writes and
that `Load from local save` / `Load from disk` / `axo:load`
([EMBEDDING.md](./EMBEDDING.md)) reads.

The current schema is **version 2**. Version 1 plans load unchanged: every
field version 2 added is optional, and a missing one means the default the
editor used before (see [Version 2](#version-2)).

The canonical source of truth is
[`src/editor/editor/persistence/`](./src/editor/editor/persistence/) —
this file restates the shape in one place for tooling and host
integrators.

## Top-level shape

```ts
interface FloorPlanSerializable {
  version: 2; // schema version; 1 is still read
  floors: FloorSerializable[]; // one entry per floor, lowest first
  furnitureId: number; // next free furniture id (monotonic counter)
  wallNodeId: number; // next free wall-node id (monotonic counter)
  units?: 'mm' | 'cm' | 'm' | 'in' | 'ft-in'; // display units (v2); lengths are never stored in them
}
```

The two `*Id` counters preserve uniqueness across save / load cycles —
without them, two items added after a load could collide with each
other.

## `FloorSerializable`

```ts
interface FloorSerializable {
  furnitureArray: IFurnitureSerializable[];
  wallNodes: INodeSerializable[];
  // adjacency list: [nodeId, neighbourIds[]]
  wallNodeLinks: [number, number[]][];
  // v2, optional: exterior walls as [leftNodeId, rightNodeId], in the order
  // wallNodeLinks lists them; every other wall is interior (thinner)
  exteriorWalls?: [number, number][];
  wallHeightM?: number; // v2, optional: metres; default 2.7
  elevationM?: number; // v2, optional: metres above ground; default 3.0 per storey
}
```

`wallNodeLinks` is a tuple list rather than a `Map` so that
`JSON.stringify` round-trips cleanly. The deserializer rebuilds a `Map`
at load time.

## `INodeSerializable`

```ts
interface INodeSerializable {
  id: number; // unique within the plan
  x: number; // world-space x in editor units (1 m = METER from constants.ts)
  y: number; // world-space y, y-down
}
```

## `IFurnitureSerializable`

```ts
interface IFurnitureSerializable {
  id: number;
  texturePath: string; // resolves via the built-in catalog under src/res/catalog/
  width: number; // metres, across the plan
  height: number; // metres, down the plan (depth, not how tall it is)
  rotation: number; // radians
  x: number; // world-space
  y: number; // world-space
  orientation: number; // discrete 0|1|2|3 — number of 90° steps applied
  zIndex: number; // Pixi sort key
  attachedToLeft?: number; // wall-node id the item is anchored to (doors / windows)
  attachedToRight?: number; // second anchor node id; together they pin the item to a wall segment
  heightM?: number; // v2, optional: how tall it is, metres; a door or window's opening height
  mountM?: number; // v2, optional: base above the floor, metres; a window's sill
}
```

`attachedToLeft` / `attachedToRight` are present only on items attached
to a wall (typically doors and windows). Free-standing furniture omits
both.

## Version 2

Added 2026-09-28 for the 3D view. All optional, so version 1 plans need no
migration.

| Field           | Where | Absent means                                                                                                                |
| --------------- | ----- | --------------------------------------------------------------------------------------------------------------------------- |
| `exteriorWalls` | floor | every wall interior. Before v2 the exterior flag was not saved at all, so a v1 plan re-opens with every wall interior.      |
| `wallHeightM`   | floor | 2.7 m                                                                                                                       |
| `elevationM`    | floor | stacked at 3.0 m per storey                                                                                                 |
| `heightM`       | item  | the catalogue's height for its `texturePath`, else 0.7 m; doors 2.1 m, windows 1.2 m                                        |
| `mountM`        | item  | the catalogue's mount height, else on the floor; windows 0.9 m                                                              |
| `units`         | plan  | millimetres. How lengths are shown and typed, never how they are stored; the scene format's `units` field. Added 2026-09-29 |

The editor records an item's catalogue `heightM` and `mountM` when it is
placed, as it records the footprint, so a later catalogue change does not
alter a saved plan. It always saves the current version, so a v1 plan
re-saves as v2.

## Minimal example

```json
{
  "version": 2,
  "furnitureId": 1,
  "wallNodeId": 3,
  "floors": [
    {
      "furnitureArray": [],
      "wallNodes": [
        { "id": 1, "x": 0, "y": 0 },
        { "id": 2, "x": 1000, "y": 0 }
      ],
      "wallNodeLinks": [
        [1, [2]],
        [2, [1]]
      ]
    }
  ]
}
```

This is a single wall between two nodes 10 m apart: editor units are
centimetres (`METER = 100` in `constants.ts`).

## Parsing and validation

The editor never calls `JSON.parse` directly on plan input. The
persistence layer exposes two helpers:

- `safeParsePlan(text: string): unknown` — `JSON.parse` with a reviver
  that drops `__proto__`, `constructor`, and `prototype` keys at parse
  time. Returns `unknown` so the caller is forced to validate.
- `validatePlanShape(value: unknown): FloorPlanSerializable | null` —
  rejects non-objects, non-array `floors`, and non-number `furnitureId`
  / `wallNodeId`. Returns `null` on rejection.

Both live in
[`FloorPlanSerializable.ts`](./src/editor/editor/persistence/FloorPlanSerializable.ts).

`FloorPlan.load` calls both in sequence and surfaces an error
notification if either step fails. Hosts integrating via
[`EMBEDDING.md`](./EMBEDDING.md) see this as a silent rejection: the
editor stays on the previously-loaded plan and toasts the error
in-frame.

## Versioning policy

- The on-disk `version` field is a single integer.
- New required fields, removed fields, or semantic changes to existing
  fields bump the version.
- `Serializer.load` accepts the versions in `SUPPORTED_PLAN_VERSIONS`
  (1 and 2) and refuses any other. A version that changes a field's
  meaning adds a forward-only migration there. Plans missing a `version`
  are treated as version 1 (legacy plans written before the field
  existed).
- Adding an optional field whose absence means the old behaviour does
  not need a migration, only a version bump so older builds refuse the
  file instead of silently dropping the field.
- Migrations are append-only — never edit an existing migration.

There is no schema for the catalog itself; `texturePath` is resolved
against the bundled catalog at load time, and unresolved paths fall
back to a placeholder texture.

## Out of scope

- The catalog manifest (`src/res/catalog/elements/manifest.json` and
  `src/res/catalog/wall-fittings.json`) — that ships with the
  build and is not part of the plan payload.
- UI state (selected tool, snap mode, viewport position). The plan
  describes the model, not the editor session.
