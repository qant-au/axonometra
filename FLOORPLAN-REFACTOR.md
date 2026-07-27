# FloorPlan refactor — Stage 6 design

Tracking: `TODO.md` `@id(axo-020)`. Triggered by code-review-2026-06-09 finding 4c.1 and action item 25. Prereq: `axo-008` (Pixi v8 migration) — refactoring against Pixi 6 wastes work.

> **Shipped 2026-07-27.** See "What actually shipped" at the foot of this document — the delivered design differs from the target sketched below in one significant way, and that section is the accurate record.

## Why

`src/editor/editor/objects/FloorPlan.ts` was doing four jobs:

1. **Pixi Container** — extends `Container`, holds `Floor[]` children, hands them to the scene graph.
2. **Model store** — owns `floors`, `currentFloor`, `furnitureId`, `visibleLabels`.
3. **Persistence** — `save()` / `load()` / `print()` serialize and deserialize the same model state.
4. **Singleton** — `static instance`, lazily constructed by `Instance` getter, manually torn down by `dispose()`.

The static singleton is the source of every lifecycle bug we've fought (the `dispose()` pair, the `mainHolder` pattern, the `TransformLayer` / `AddWallManager` siblings that mirror it). Moving the model out of the Container removes the singleton's reason to exist.

## Current shape (after Stage 5)

```
EditorRoot (React)
  └─ Application (Pixi)
       └─ Main (Viewport)
            └─ FloorPlan.Instance ← static singleton, holds Floor[]
                 └─ Floor (Container)
                      └─ WallNodeSequence, Furniture[], …
```

State flows: React effects mutate `FloorPlan.Instance` directly via singleton accessors. Serializer walks `Floor[]` to write JSON. Loader replaces `floors` in place.

## Target shape

```
EditorRoot (React)
  └─ Application (Pixi)
       └─ Main (Viewport)
            └─ FloorPlan (Pixi Container, plain instance)
                 └─ subscribes to useFloorPlanStore
                 └─ Floor (Pixi Container, plain instance)
                      └─ subscribes to its slice
```

```ts
// stores/FloorPlanStore.ts (new)
export const useFloorPlanStore = create<FloorPlanState>((set, get) => ({
  version: 1,
  currentFloor: 0,
  furnitureId: 0,
  floors: [ /* FloorModel — pure data, no Pixi */ ],
  visibleLabels: true,

  setCurrentFloor: (n) => set({ currentFloor: n }),
  addFloor: (model) => set((s) => ({ floors: [...s.floors, model] })),
  removeFloor: (i) => /* ... */,
  addFurniture: (floorIdx, fur) => /* ... */,
  loadPlan: (raw) => /* ... */,
}))
```

`FloorPlan` (Pixi container) becomes a thin consumer:

```ts
export class FloorPlan extends Container {
  private unsubscribe: () => void;
  constructor() {
    super();
    this.unsubscribe = useFloorPlanStore.subscribe(
      this.syncFromStore.bind(this)
    );
    this.syncFromStore(useFloorPlanStore.getState());
  }
  destroy(opts) {
    this.unsubscribe();
    super.destroy(opts);
  }
  private syncFromStore(s: FloorPlanState) {
    /* diff + reconcile child Floors */
  }
}
```

No `static Instance`. No `dispose()`. `EditorRoot` instantiates `new FloorPlan()` in its effect, calls `floorPlan.destroy(...)` in cleanup, and the store survives across remounts.

## Migration sequence

Parallel-run-then-cut-over to keep main green:

1. **Land Pixi v8 (axo-008).** No Stage 6 work starts until v8 is live.
2. **Step 1 — introduce store, dual-write.** Create `useFloorPlanStore` with the same shape as today's `FloorPlan` model fields. Every mutation in `FloorPlan` _also_ writes to the store. Reads still go through `FloorPlan.Instance`. Lands without observable change.
3. **Step 2 — flip reads.** Serializer reads from the store. `getMain().getFloorPlan()` callers in helpers read from the store where applicable. Test suite expanded with store-shape assertions.
4. **Step 3 — drop the singleton.** `FloorPlan` becomes a plain `new`-able class. `EditorRoot` owns the instance. `dispose()` deleted. `static Instance` deleted.
5. **Step 4 — cleanup.** Remove dual-write paths. `TransformLayer` and `AddWallManager` get the same treatment in a follow-up.

Each step ships as a separate PR with the test suite green.

## Rollback

Steps 2 and 3 are the risky cut-overs. If a regression is spotted post-merge, revert just the step's commit — the dual-write from step 1 keeps the singleton path functional through step 2, and the store survives step 3's revert because it's its own module.

## Out of scope for axo-020

- `TransformLayer` / `AddWallManager` singletons. Same pattern, separate IDs to be allocated.
- Undo/redo. A separate feature.
- Multi-floor UX. Not changing the user-facing model.

---

## What actually shipped (2026-07-27)

The one deliberate deviation from the target above: **`floors` in the store holds the
`Floor` containers, not plain data.**

Pure-data floors were not achievable. Wall and furniture geometry lives inside live Pixi
objects (`WallNodeSequence`, `Wall`, `WallNode`, `Furniture`) whose transforms are mutated
in place by the drag handlers, with no write-back path to a model. Converting them means
rewriting the whole interaction layer — several times this task's budget, and the change
would land on the one flow the e2e suite covers. So the store owns `Floor[]` as opaque
model references: `FloorPlan` no longer owns any state, which is what the singleton
removal actually required.

Delivered:

- **`src/stores/FloorPlanStore.ts`** — `useFloorPlanStore` owns `version`, `floors`,
  `currentFloor`, `furnitureId`, `visibleLabels`, plus `changeFloor` / `removeFloor` /
  `toggleLabels` / `setPlan` / `reset` and the eleven active-floor operations that used
  to be `FloorPlan`'s delegation methods. Floors are created lazily by `getCurrentFloor()`
  rather than in the store initialiser, which runs at import time.
- **`FloorPlan`** — a view. It subscribes to the store, keeps the active floor as its only
  child, unsubscribes in `destroy()`, and retains `print()` (the one operation that needs a
  live display object). No `static Instance`, no `dispose()`. The dead `windowFurniture`
  field is gone.
- **`Serializer`** — `serialize()` takes no arguments and reads the store; `load()` parses,
  validates, notifies, and writes back via `setPlan`. It is now the whole persistence
  surface, so `save`/`load` no longer depend on the editor being mounted.
- **Instance ownership** — `EditorRoot` exports `floorPlanHolder` + `getFloorPlan()`,
  matching the existing `mainHolder` / `rendererHolder` pattern. Cleanup calls
  `useFloorPlanStore.getState().reset()`; the container itself is destroyed by
  `app.destroy(true, true)`, and that cascade runs the unsubscribe.
- **Duplicate state removed** — `EditorStore.floor` / `setFloor` were a mirror written by
  `FloorPlan`'s `CurrentFloor` setter. Deleted; `ToolNavbar` reads
  `useFloorPlanStore((s) => s.currentFloor)`.
- **Bugs fixed in passing** — `reset()` now detaches the old `Floor` containers instead of
  orphaning them; `changeFloor(-1)` on the ground floor is refused rather than assigning
  `floors[-1]`; `dispose()`/`reset()` collapsed into one action. (The static
  `WallNodeSequence.wallNodeId` counter needed no change — `Floor.reset()` already zeroes
  it via `WallNodeSequence.reset()`.)

Not done as separate steps: the doc's five-step dual-write migration was unnecessary once
`floors` stayed as `Floor[]`, because there is no second representation to keep in sync.
The change landed as one sequence of commits with the suite green at each.
