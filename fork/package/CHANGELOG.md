# Changelog: @axonometra/editor

Releases of the npm package. The engine's upstream history (NeonPlan 3D) is in the repository's own
CHANGELOG.md. Pre-1.0, releases step the patch number: 0.8.1, 0.8.2 and so on.

## Unreleased

- The start page offers "New" or "Open Existing". "Open Existing" takes a plan file from disk, and lists
  the saved plans a host gives in the new `plans` option (`SavedPlans`: `list()` and `open(id)`).
- `browserPlans(current?, onCurrent?)`: a store and a `plans` list over every plan saved in the browser.
- A new plan is two pages: what to plan (a boat, a building, or a caravan or mobile home), then its basics.
  A boat asks its hull type, length, beam, draft and engines; a building its width, depth, levels and
  basement; a caravan its type, length and width. Everything else is set once the plan is open.

## [0.8.0] - 2026-10-30

The first release of Axonometra as a 3D planning engine.

- **Replaces the earlier package.** `@axonometra/editor` 0.7.0 and before were a different project, a
  React floor planner, now archived. 0.8.0 is a new engine with a new API: a web component mounted by
  `mountAxonometra()`, not a React component.
- `mountAxonometra(target, options)` puts the planner (plan, editor, 3D view) into any page, with no
  server and no Home Assistant.
- Plan stores: `browserStore(name)` (IndexedDB) and `memoryStore(initial?)`, or any object with the four
  `PlanStore` methods.
- Live data: `staticSignals()`, or any `SignalSource`.
- Example plans in `@axonometra/editor/plans`: six buildings and one boat.
- Type declarations for the whole public API.
