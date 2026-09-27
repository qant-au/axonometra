# Changelog

All notable changes to Axonometra are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Expect breaking changes between minor versions until v1.0.0.

## [Unreleased]

### Changed

- UI stack: Mantine 4 → 9, which requires React 18 → 19. `createStyles` replaced by CSS modules with `light-dark()`; unused `@mantine/dropzone` dropped.
- State: Zustand 3 → 5 (named `create`, curried typing); `tabler-icons-react` → `@tabler/icons-react`.
- Architecture: the floor-plan model moved out of the `FloorPlan` Pixi container into a `useFloorPlanStore` Zustand store. `FloorPlan` is now view-only, the `Serializer` reads and writes the store directly, and the static `FloorPlan.Instance` / `dispose()` pair is gone. See `FLOORPLAN-REFACTOR.md`.
- Toolchain: Vite 6 → 8, Vitest 2 → 5, `@vitejs/plugin-react` 5 → 6, `@types/node` 20 → 22 to match the Node 22 runtime. `engines.node` is now `>=22.12`.
- CI: the `npm audit` step is a blocking gate on the production tree at high and above, and CI also runs weekly. Dependabot alerts, security updates and version updates are enabled.

### Fixed

- Licensing: the repository is `MIT AND Apache-2.0`, not MIT alone. Code carried over from upstream arcada stays under Apache-2.0, whose full text now ships verbatim in `LICENSE-APACHE` as section 4(a) requires; `LICENSE`, the README and `package.json` now say so.

### Security

- All npm advisories cleared (`npm audit` reports 0). This includes `@xmldom/xmldom` 0.8.13 → 0.8.15, which ships in the production bundle via `pixi.js`, and the Vitest UI / Vite dev-server advisories.

## [0.3.0] — 2026-06-17

Pixi 8 migration and the 2026-06-16 action-items batch.

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
- TODO.md with the Stage 2 / 3 / 4 roadmap.

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
