# Changelog

All notable changes to Axonometra are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Expect breaking changes between minor versions until v1.0.0.

## [Unreleased]

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

[Unreleased]: https://github.com/qant-au/axonometra/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/qant-au/axonometra/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/qant-au/axonometra/releases/tag/v0.1.0
