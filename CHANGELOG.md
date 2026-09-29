# Changelog

All notable changes to Axonometra are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Expect breaking changes between minor versions until v1.0.0.

## [Unreleased]

### Added

- The shared keymap (Accurona's `docs/keymap.md`, the same one Reticulyne binds, aligned with Excalidraw). Tool keys (V/1 select, H hand, L/6 wall, W window, D door, M measure, E/0 erase), Ctrl/Cmd + = / - / 0 zoom, Shift + 1 / Shift + 2 fit everything / the selection, Alt + Shift + D light or dark, and a `?` list of every key with the Excalidraw differences (also on the toolbar). The table is `@accurona/core`'s, so the list cannot drift from the keys.
- Selection: click, Shift + click, drag a box on the empty plan, Ctrl/Cmd + A; Delete or Backspace deletes it and the arrow keys nudge it (10 cm, Shift 1 m). A selected wall is outlined; one piece of furniture still gets its handles.
- Copy, cut, paste (under the pointer) and duplicate (Ctrl/Cmd + C, X, V, D), and Alt + drag to leave a copy behind. A copied wall brings its doors and windows. Each is one undo step.
- Find (Ctrl/Cmd + F): an item by name on any floor; choosing it goes to its floor, selects it and brings it into view.
- Right-click menu: copy, cut, duplicate, delete, and per object Turn, Edit length, Make exterior / interior; on the empty plan Paste, Select all, Fit everything. A right drag still pans.
- Space + drag pans from any tool.

- Walk-through in the 3D view: switch from Orbit to Walk to see a floor at eye height. Walk with W A S D or the arrow keys (Q/E turn), drag to look, or use the on-screen stick on a touch screen; walls and window sills stop you and you slide along them, doorways let you through. Teleport mode (click the floor to go there, keys step 1 m and turn 30°) is on by default under reduced motion. Page Up / Page Down, or the stair buttons, change floor at a stairs item. Position and heading are announced in a live region.
- 3D model export: **Save 3D model** in the 3D view downloads the plan as a glTF binary (`.glb`, metres, y up) with every floor, whole walls and the catalogue models, for Blender and other 3D tools. Embedding hosts get the same file with the new `axo:export` message (reply `axo:exported`, or `axo:error` with `unsupported-format` / `export-failed`). three.js still loads only on first use.
- 3D view (toolbar): the plan as a 3D model you can turn, zoom and move, with mitred wall corners, door and window openings, a floor and ceiling per room, and every catalogue item drawn from its 3D model in the element library (scaled to its footprint, mirrored and turned as placed, at its mount height; items without a model are boxes at their real height). Walls can be cut away at 1.2 m to see into the rooms, every floor can be stacked, and the view saves as a PNG. Keyboard buttons for turning and zooming; smooth camera motion is off under reduced motion. three.js (MIT) is lazy-loaded, about 150 KB gzip, so an embed that never opens the view pays nothing. Built from the saved plan (`src/editor/scene3d/`).
- A full furniture and equipment catalogue: 229 items in 12 groups, from beds and kitchens to server racks (26 sizes up to 45U), UPS, cooling, CCTV, access control and fire equipment. Items come from the shared element library `qant-au/elements` (also used by Reticulyne), vendored into `src/res/catalog/elements/` by `scripts/sync-elements.mjs`. Each item carries its real height (and mount height for wall and ceiling gear), which the axonometric view now uses. Small ceiling and wall devices show as 40 cm plan symbols. Icons load on first use rather than all at startup. The legacy `bed`, `chair` and `table` ids keep their footprints, so saved plans are unchanged.
- Type a wall's length: in Edit mode, double-click a wall (or press L with the keyboard cursor on it) to open a "Set wall length" box. The wall resizes about its midpoint, keeping its direction, as one undo step. The value is read like the wall label, i.e. less one wall thickness. Resolves upstream arcada issue #13.
- Axonometric view (toolbar cube button): the current floor, or all floors stacked, drawn as an isometric SVG with walls extruded to 2.7 m, doors and windows in their walls, and furniture as blocks. Turn it in 90° steps. Read-only; the projection is pure geometry in `src/editor/axonometric/`.
- Signed embedding. With `VITE_EMBED_PLAN_PUBLIC_KEYS` set at build time, every `axo:load` must carry an ECDSA P-256 signature from the host's backend over the plan, an expiry and the host's session token; unsigned, expired, tampered or replayed plans are refused. A `session` sent with a load is echoed on every `axo:save`, and new `axo:loaded` / `axo:error` replies tell the host the outcome. See `EMBEDDING.md`, "Signed plans".
- Keyboard editing on the canvas. The canvas is a focusable `role="application"` with instructions for screen readers; arrow keys move a grid cursor (Shift for 1 m), Enter/Space applies the active tool, Edit mode picks up and moves wall points, walls and furniture, and Escape cancels or ends wall drawing. Every action, including a refused one, is announced in a live region, and each keyboard edit is one undo step. See `src/editor/editor/KeyboardCursor.ts`.
- Undo and redo: Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z or Ctrl+Y, and toolbar buttons. History is whole-plan snapshots taken through the Serializer, because the model lives inside Pixi objects that the drag handlers mutate in place. Each canvas pointer gesture or toolbar edit is one step, nothing is recorded when the plan did not change, and loading a plan clears the history. See `src/editor/editor/history.ts`.

### Changed

- **The mouse wheel pans** (Shift + wheel sideways); Ctrl/Cmd + wheel or a pinch zooms. It used to zoom.
- **Bare L is the wall tool.** The wall-length box moved to Ctrl/Cmd + Enter (and Enter with the wall selected); double-click still opens it.
- **Right-click opens a menu** instead of turning an item or switching a wall between interior and exterior; both are in the menu.
- In Walk, the left and right arrow keys step sideways, as the keymap says; Q and E turn.
- Ctrl/Cmd + S no longer saves in a read-only embed or while typing, and Cmd + Y no longer redoes (Ctrl + Y does).

- **Plans are saved as [Accurona scenes](https://github.com/qant-au/accurona/blob/main/docs/scene-format.md)** (breaking): the toolbar Save, Ctrl+S and `axo:save` all write the scene format Axonometra shares with Reticulyne, validated by `@accurona/core`'s schema. Plan format v1 and v2 files still open and save as scenes; nothing writes plan v2 any more. A scene keeps what Axonometra does not draw (diagram views, device props, ports, links, connections) and its ids through every save.
- UI library: Mantine → MUI, so Axonometra and Reticulyne share one look (menus, panels, dialogs, notifications). The shared parts come from Accurona's `@accurona/ui`, vendored into `src/vendor/accurona-ui/` by `scripts/sync-elements.mjs`.
- Plan file format version 2. New optional fields: per floor, which walls are exterior, wall height and elevation; per item, its height and its height above the floor (a window's sill). Version 1 plans load unchanged, and the editor now always saves version 2. The axonometric view uses the new fields. See `PLAN-FORMAT.md`.
- UI stack: Mantine 4 → 9, which requires React 18 → 19. `createStyles` replaced by CSS modules with `light-dark()`; unused `@mantine/dropzone` dropped.
- State: Zustand 3 → 5 (named `create`, curried typing); `tabler-icons-react` → `@tabler/icons-react`.
- Architecture: the floor-plan model moved out of the `FloorPlan` Pixi container into a `useFloorPlanStore` Zustand store. `FloorPlan` is now view-only, the `Serializer` reads and writes the store directly, and the static `FloorPlan.Instance` / `dispose()` pair is gone. See `FLOORPLAN-REFACTOR.md`.
- Toolchain: Vite 6 → 8, Vitest 2 → 5, `@vitejs/plugin-react` 5 → 6, `@types/node` 20 → 22 to match the Node 22 runtime. `engines.node` is now `>=22.12`.
- CI: the `npm audit` step is a blocking gate on the production tree at high and above, and CI also runs weekly. Dependabot alerts, security updates and version updates are enabled.

### Fixed

- Saving a plan lost which walls were exterior: every wall came back interior (thinner) after a save and load, including plans sent through `axo:save`. Plan format version 2 records them.
- Licensing: the repository is `MIT AND Apache-2.0`, not MIT alone. Code carried over from upstream arcada stays under Apache-2.0, whose full text now ships verbatim in `LICENSE-APACHE` as section 4(a) requires; `LICENSE`, the README and `package.json` now say so.

### Security

- All npm advisories cleared (`npm audit` reports 0). This includes `@xmldom/xmldom` 0.8.13 → 0.8.15, which ships in the production bundle via `pixi.js`, and the Vitest UI / Vite dev-server advisories.

## [0.3.0] — 2026-06-17

Pixi 8 migration and a batch of review fixes.

### Added

- Playwright e2e runs in CI and is blocking. The `place-wall` spec waits for the WelcomeModal overlay to detach before drawing, which was the source of its flakiness.
- `simple-git-hooks` + `lint-staged` pre-commit hook (ESLint and Prettier on staged files).
- Non-blocking `npm audit` step in CI.
- Issue and pull-request templates.
- README sections on saving and loading, and on accessibility.
- File-input validation when loading a plan; fallback texture for furniture images that fail to load.

### Changed

- Pixi.js 6 → 8, laddered through 7: federated events, `Graphics` `rect()`/`.fill()`/`.stroke()`, async `Application.init`, `Assets` preloading in place of `Loader`, and `Text({ text, style })`. `pixi-viewport` 4 → 6. `Wall.label` and `WallNode.setSize` were renamed (`lengthLabel`, `setNodeSize`) to avoid colliding with Pixi 8's `Container` members.
- WelcomeModal can be dismissed with Escape or an outside click.
- Components read the Zustand stores through selectors.
- React and react-dom split into their own vendor chunk.
- Node 22 in CI and `.nvmrc`; Vitest globals turned off.
- `manifest.json` uses the Axonometra name.

### Fixed

- Snap-toggle notification text, double snapping on pointer moves, and the default save filename.
- `HelpDialog` no longer breaks on an out-of-range active tool.
- Navbar focus ring uses a valid `:focus-visible` selector; navbar buttons have `aria-label`s.

### Removed

- Dead code: the never-read `FloorPlan.actions` undo stack, `assets.ts`, `Floor.clearScreen`, `Label.toggleLabel`, a duplicate `ToolMode` enum, `src/App.css` and a debug `console.log`.
- `react-device-detect` dependency, replaced by a dependency-free `matchMedia` check.

## [0.2.0] — 2026-06-09

Stage 4 (quality foundation) plus the in-flight Stage 5 work that landed before
the tag.

### Added

- ESLint flat config, Prettier, and `.editorconfig` for consistent style across the codebase.
- GitHub Actions CI: lint, Prettier check, `tsc --noEmit`, Vitest, and Vite build on every push and PR.
- Vitest unit-test suite — 56 tests covering geometric helpers, Zustand stores, `WallNodeSequence`, `AddWallManager.checkStep`, `Serializer` round-trip, and `FloorPlanSerializable` parsing/validation. Backed by a minimal Pixi mock at `src/test/pixiMock.ts`.
- Playwright critical-flow spec (`e2e/place-wall.spec.ts`) that drives the canvas, validates the local-save round-trip, and uses a DEV-only `window.__axo` introspection handle.
- Built-in furniture, door, and window catalog under `src/res/catalog/` — the upstream `arcada-backend` Express server is no longer required.
- Minimum embedding surface: `postMessage` bridge (`axo:load`, `axo:request-save`, `axo:save`, `axo:ready`), URL parameters (`embed`, `readonly`), and an origin allowlist via `VITE_EMBED_ALLOWED_ORIGINS`. Documented in `EMBEDDING.md`.
- Content-Security-Policy header in `docker/nginx.conf`, including `frame-ancestors` (replaces the legacy `X-Frame-Options`).
- Schema version field (`version: 1`) on `FloorPlanSerializable`, plus a prototype-pollution-safe JSON reviver (`safeParsePlan`) and shape validation (`validatePlanShape`).
- `.env.example` documenting `VITE_EMBED_ALLOWED_ORIGINS`.
- Lazy code-splitting: `manualChunks` for Pixi, Mantine, and React; `React.lazy` + Suspense boundaries around `FurnitureAddPanel` and `HelpDialog`.
- Editor magic numbers hoisted into named constants (`SNAP_THRESHOLD`, `MISCLICK_THRESHOLD`, `WALL_COLOR`, `NODE_COLOR`, `HANDLE_MOBILE_SCALE`, `LABEL_FONT`, etc.).

### Changed

- TypeScript: `strict: true` plus `strictNullChecks`, `noImplicitOverride`, `noUnusedLocals`/`Parameters` — full pass clean (129 → 0 errors).
- Vite 6, Vitest 2, `@vitejs/plugin-react` 5 bumps.
- `FloorPlan.print` exports as a PNG download instead of opening a popup window; renderer is sized to plan bounds and destroyed after use.
- Help GIFs moved from the JS bundle to `public/help/`.
- `Furniture.switchOrientation` and `setOrientation` share a single `applyStep` helper.
- `EditorRoot` lifecycle: singletons and global keyboard/contextmenu listeners now reset and unregister on unmount, fixing React 18 StrictMode and HMR remounts.

### Fixed

- `FloorPlan.load` now wraps `JSON.parse` in `try`/`catch`, rejects non-string input, surfaces Mantine notifications on failure, and strips `__proto__` / `constructor` / `prototype` keys.
- `WelcomeModal` guards against a `null` autosave on first load.
- `WallNodeSequence.remove` guards against missing map entries.
- Dropped redundant `mousemove` redraw subscription in `WallNodeSequence` — every mutating caller already triggers `drawWalls()`.
- `Furniture.attachedTo` no longer overwrites `this.parent`; subsequent `addChild` calls set it correctly.
- Allowlist validation on `data.imagePath` before texture/URL interpolation.
- Removed the dead `Tool.FurnitureAdd` enum member that would crash `HelpDialog` if reached.
- Resolved both `react-hooks/exhaustive-deps` warnings via `useStore.getState()`.

### Security

- Inbound `postMessage` traffic is dropped unless the origin is on the build-time `VITE_EMBED_ALLOWED_ORIGINS` allowlist.
- CSP with `frame-ancestors 'self'` replaces `X-Frame-Options: SAMEORIGIN`.
- Plan-file loading hardened against prototype pollution and malformed input.

## [0.1.0] — 2026-06-09

Initial Axonometra release after the fork from
[mehanix/arcada](https://github.com/mehanix/arcada).

### Added

- Renamed the codebase from arcada → axonometra (titles, imports, IDE module identifiers, assets).
- `package.json` renamed to `axonometra-core@0.1.0`.
- Migrated from Create React App to Vite + Vitest.
- Switched to `createRoot` and aligned `@types/react` with React 18.
- Transitional multi-stage Dockerfile (`build → nginx`) and `restart.sh` helper.
- Playwright smoke spec validating title, modal, and canvas mount.

### Changed

- Relicensed from upstream Apache-2.0 to MIT; upstream attribution preserved in `LICENSE`.
- README rewritten for the rename and the QANT fork direction.

### Removed

- Upstream-only assets and the thesis PDF.
- Unused dependencies; moved `@types/*` to `devDependencies`.

[Unreleased]: https://github.com/qant-au/axonometra/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/qant-au/axonometra/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/qant-au/axonometra/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/qant-au/axonometra/releases/tag/v0.1.0
