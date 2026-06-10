# Axonometra plan file format

This document describes the JSON shape that `Save` (Ctrl+S) writes and
that `Load from local save` / `Load from disk` / `axo:load`
([EMBEDDING.md](./EMBEDDING.md)) reads.

The current schema is **version 1**.

The canonical source of truth is
[`src/editor/editor/persistence/`](./src/editor/editor/persistence/) —
this file restates the shape in one place for tooling and host
integrators.

## Top-level shape

```ts
interface FloorPlanSerializable {
  version: 1; // schema version, future-proofed
  floors: FloorSerializable[]; // one entry per floor; the editor today ships a single floor
  furnitureId: number; // next free furniture id (monotonic counter)
  wallNodeId: number; // next free wall-node id (monotonic counter)
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
  width: number; // editor units
  height: number; // editor units
  rotation: number; // radians
  x: number; // world-space
  y: number; // world-space
  orientation: number; // discrete 0|1|2|3 — number of 90° steps applied
  zIndex: number; // Pixi sort key
  attachedToLeft?: number; // wall-node id the item is anchored to (doors / windows)
  attachedToRight?: number; // second anchor node id; together they pin the item to a wall segment
}
```

`attachedToLeft` / `attachedToRight` are present only on items attached
to a wall (typically doors and windows). Free-standing furniture omits
both.

## Minimal example

```json
{
  "version": 1,
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

This is a single wall between two nodes 1 m apart (with the default
`METER = 1000`).

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

`FloorPlan.load` calls both in sequence and surfaces a Mantine error
notification if either step fails. Hosts integrating via
[`EMBEDDING.md`](./EMBEDDING.md) see this as a silent rejection: the
editor stays on the previously-loaded plan and toasts the error
in-frame.

## Versioning policy

- The on-disk `version` field is a single integer.
- New required fields, removed fields, or semantic changes to existing
  fields bump the version.
- `FloorPlan.load` dispatches on `version` and runs forward-only
  migrations. Plans missing a `version` are treated as version 1
  (legacy plans written before the field existed).
- Migrations are append-only — never edit an existing migration.

There is no schema for the catalog itself; `texturePath` is resolved
against the bundled catalog at load time, and unresolved paths fall
back to a placeholder texture.

## Out of scope

- The catalog manifest (`src/res/catalog/*.json`) — that ships with the
  build and is not part of the plan payload.
- UI state (selected tool, snap mode, viewport position). The plan
  describes the model, not the editor session.
- Multi-floor support. The schema admits it; the editor today exposes
  a single floor.
