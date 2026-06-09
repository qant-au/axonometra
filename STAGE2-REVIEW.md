# Stage 2 — Project Review

**Date:** 2026-06-09
**Scope:** `/Users/adam/Projects/axonometra` at commit `5a567a0` (end of Stage 1).
**Goal:** identify what blocks Stage 3, what gates qant-standard quality, and what's cosmetic. Each finding is tagged with severity and target stage.

---

## Baseline

The transitional container (`Dockerfile` + `docker/nginx.conf` + `restart.sh`, ports 4890-4899 reserved) was built and run via `NO_WATCH=1 bash restart.sh`.

**Result: BUILD FAILED.**

The container infrastructure itself is sound — the failure is in the application source. CRA's TypeScript compiler aborted `npm run build` at:

```
TS2304: Cannot find name 'WALL_THICKNESS'.
  src/editor/editor/objects/TransformControls/Handle.ts:188
```

This blocks any screenshot baseline. It is recorded as **F-01** below and becomes the first sub-step of Stage 3 — fix the build before renaming, then capture a real baseline.

No `STAGE2-baseline.png` was captured.

---

## Severity rubric

- **P0** — blocks Stage 3 or breaks the app today; must be fixed before Stage 3 can proceed.
- **P1** — qant-standard gap (lint, CI, tests, deprecated tooling, security advisories); plan placement explicit.
- **P2** — cosmetic / cleanup; queue for whichever stage is most convenient.

## Findings summary

| ID | Severity | Stage | Title |
|---|---|---|---|
| F-01 | P0 | Stage 3 (first) | Missing `WALL_THICKNESS` import in `Handle.ts` breaks the build |
| F-02 | P0 | Stage 3 | LICENSE (Apache-2.0) and README (MIT) disagree — relicense to MIT with attribution |
| F-03 | P1 | Stage 3 | Create React App is deprecated — migrate to Vite (per existing plan) |
| F-04 | P1 | Stage 4 | Pixi.js 6.3 → 8 migration (15 files import pixi) |
| F-05 | P1 | Stage 3 | `three@0.140.0` is in deps but has zero imports — remove |
| F-06 | P1 | Stage 3 | `pixi-bump` and `pixi-plugin-bump` have zero imports — remove |
| F-07 | P1 | Stage 3 + Stage 4 | `npm audit` reports 71 vulnerabilities (4 critical, 31 high) |
| F-08 | P1 | Stage 4 | TypeScript 4.6 + strict mode disabled (all strict flags commented out) |
| F-09 | P1 | Stage 3 (smoke) + Stage 4 (expand) | Zero unit/component tests, no `setupTests.ts` |
| F-10 | P1 | Stage 4 | No ESLint flat config, no Prettier, no `.editorconfig`; only inline CRA defaults |
| F-11 | P1 | Stage 4 | No GitHub Actions CI |
| F-12 | P1 | Stage 3 | `process.env.REACT_APP_SERVICE_URI` in `api-client.tsx` — must move to `import.meta.env.VITE_*` |
| F-13 | P1 | Stage 3 | `ReactDOM.render` in `index.tsx` — deprecated in React 18, swap to `createRoot` |
| F-14 | P1 | Stage 3 | `@types/react@^17` mismatched with `react@^18` — bump to `@types/react@^18` |
| F-15 | P2 | Stage 3 | All `@types/*` listed under `dependencies` — move to `devDependencies` |
| F-16 | P1 | Stage 3 | `package.json` name is the typo `arkada-react` — rename to `axonometra-core` (already in plan) |
| F-17 | P2 | Stage 3 | Upstream binary blobs in `public/` (armchair.fbx/mtl/obj, m.azw3, sofa.svg, background-pattern.svg, logo-min.png) |
| F-18 | P2 | Stage 3 | `docs/Docs - Bachelor's thesis.pdf` (3.1 MB upstream artifact) |
| F-19 | P2 | Stage 3 | `.idea/` is committed and contains `arcada.iml`; `.idea/` is not in `.gitignore` |
| F-20 | P1 | Stage 3 | Hardcoded "arcada" strings (3 files; package.json typo separately F-16) |
| F-21 | P2 | Stage 4 | `WelcomeModal` shows a "desktop only" notice — revisit for tablet/touch UX |

---

## Findings — detail

### F-01 — Missing `WALL_THICKNESS` import in `Handle.ts` breaks the build
**Severity:** P0     **Stage:** 3 (first sub-step)
**Where:** `src/editor/editor/objects/TransformControls/Handle.ts:188-199`
**Finding:** `WALL_THICKNESS` is used four times (lines 188, 189, 194, 199) but never imported. The constant is exported from `src/editor/editor/constants.ts` and used correctly in sibling files (`Floor.ts`, `Wall.ts`, `WallNode.ts`, `Label.ts`) via `import { WALL_THICKNESS } from "../../constants";`. Production build aborts with `TS2304`. CRA dev server (`npm start`) may be more permissive and surface this as a warning rather than a hard error, which is likely why upstream shipped it.
**Recommendation:** Add `import { WALL_THICKNESS } from "../../constants";` to `Handle.ts` (path matches the sibling `Wall.ts` import). One-line surgical fix. Must land in Stage 3 before the rename so the build can verify.

### F-02 — LICENSE (Apache-2.0) and README (MIT) disagree
**Severity:** P0     **Stage:** 3
**Where:** `LICENSE` (Apache 2.0 boilerplate, 11 KB), `README.md` (mentions MIT in "Relationship to Arcada" and bottom "License" section).
**Finding:** Upstream `mehanix/arcada` ships under Apache-2.0. Stage 1's README was written assuming MIT. Per the project decision, axonometra ships as MIT.
**Recommendation:** Stage 3 replaces `LICENSE` with an MIT file. Apache-2.0's NOTICE/attribution requirement (section 4) is honoured by including a header comment in the new LICENSE crediting the upstream Apache-2.0 copyright (Nicoleta Mehanix / arcada) and pointing at `https://github.com/mehanix/arcada`. README wording is updated in the same commit: "inherited (MIT)" → "MIT (relicensed from Apache-2.0; see LICENSE for upstream attribution)" — this also closes the **Stage 1 follow-up** below.

### F-03 — Create React App deprecation
**Severity:** P1     **Stage:** 3 (already scheduled)
**Where:** `package.json` (`react-scripts@5.0.0`).
**Finding:** CRA is deprecated by Meta; no active maintenance, no Webpack 5 fixes, no React 19 readiness. Already accounted for in the plan.
**Recommendation:** Continue with the Stage 3 Vite + Vitest migration as planned. No new finding-driven action.

### F-04 — Pixi.js 6.3 → 8 migration
**Severity:** P1     **Stage:** 4
**Where:** 15 source files import `pixi.js` (most concentrated in `src/editor/editor/`).
**Finding:** Current Pixi major is v8 (2024+). v6 → v8 has breaking changes: `Loader` removed (replaced by `Assets`), `InteractionEvent` renamed (`FederatedPointerEvent`), `Application` init is now async, `TilingSprite` and `Graphics` APIs shifted. The custom floor-plan engine touches `Application`, `Viewport` (via `pixi-viewport`), `InteractionEvent`, `Loader`, `Point`, `TilingSprite`, `Container`, `PluginManager`.
**Recommendation:** Defer to Stage 4. Plan the upgrade in this order: `pixi.js@6 → @7` first (smaller jump, retains `Loader`), then `@7 → @8`. Bump `pixi-viewport` in lockstep (`v4 → v5` aligns with Pixi 7, `v6+` aligns with Pixi 8). Allow 1-2 days for the rewrite + manual QA of every drawing tool. The Playwright smoke landed in Stage 3 should catch the worst regressions; expand it before starting this work.

### F-05 — `three@0.140.0` is unused
**Severity:** P1     **Stage:** 3
**Where:** `package.json` deps, plus `@types/three@^0.139.0` in devDeps. **Zero** `import` statements for `three` in `src/`.
**Finding:** Brought in by upstream presumably anticipating the 3D walk-through feature, but no code references it. Three.js 0.140 is also ~3 years old.
**Recommendation:** Remove `three` and `@types/three` from `package.json` in Stage 3 (rationale: cleanup with rename). When the 3D walk-through view is actually built (post-v0.1.0), pick the version then.

### F-06 — `pixi-bump` and `pixi-plugin-bump` are unused
**Severity:** P1     **Stage:** 3
**Where:** `package.json` deps. Zero imports in `src/`.
**Finding:** Upstream included both packages, possibly for collision detection. Neither is referenced.
**Recommendation:** Remove both in Stage 3.

### F-07 — npm audit: 71 vulnerabilities (4 critical, 31 high, 22 moderate, 14 low)
**Severity:** P1     **Stage:** Stage 3 (post-Vite migration) + Stage 4 cleanup
**Where:** Dep tree.
**Finding:** Most flow from `react-scripts@5` → `webpack-dev-server` → `ws`, `yaml`, etc. Switching to Vite (Stage 3) eliminates the whole CRA/Webpack subtree and most advisories.
**Recommendation:** Re-run `npm audit` after the Stage 3 Vite migration. Stage 3 commit budget should include `npm audit fix` against the new tree. Any remaining advisories carry into Stage 4 for dep-by-dep upgrades.

**Stage 3 status (closed; F-07 partially resolved):** After the CRA→Vite migration the audit shrank from 71 advisories to **5**, all in the Vitest 1.x / Vite 5.x dependency chain (esbuild dev-server CORS — GHSA-67mh-4wv8-2f99). They are **dev-server-only** — the production container build does not invoke esbuild's dev server, so the shipped artifact is unaffected. `npm audit fix` (without `--force`) is a no-op. A speculative bump to Vite 6 + Vitest 2 in Stage 3 broke the `tsc -b` typecheck (`vitest.config.ts` overload mismatch) and was reverted. Deferred to Stage 4, where Vite 6 / Vitest 2 will be paired with a `@vitejs/plugin-react` major bump to clear the typings issue.

### F-08 — TypeScript 4.6 + strict mode disabled
**Severity:** P1     **Stage:** 4
**Where:** `tsconfig.json` — `target: "es2015"`, `strict: false`, all five strict flags (`noImplicitAny`, `noImplicitReturns`, `noUnusedParameters`, `noUnusedLocals`, `noImplicitOverride`) commented out.
**Finding:** TS 4.6 is from 2022. Modern is 5.4+. Strict mode off masks real type bugs (F-01 was a strict-mode-style miss). Stage 3 Vite migration will already touch `tsconfig.json` (need `moduleResolution: "bundler"`, `target: "ESNext"`).
**Recommendation:** Stage 3 brings TS to ~5.4 and updates `target`/`moduleResolution` as part of the Vite migration. Stage 4 enables `strict: true` and walks the resulting compile errors (expect ~50-150 fixes given the codebase size).

### F-09 — Zero unit/component tests
**Severity:** P1     **Stage:** 3 (smoke baseline), Stage 4 (expand)
**Where:** `find src -name "*.test*"` returns empty. No `setupTests.ts`.
**Finding:** CRA's Jest config is dormant. No regression safety net for the Pixi v8 migration in Stage 4.
**Recommendation:** Stage 3 brings up Vitest + Testing Library and the Playwright smoke. Stage 4 adds unit tests around the geometric helpers (`EuclideanDistance`, `Slope`, `ViewportCoordinates`) as the lowest-risk start, then store tests, then the editor actions.

### F-10 — No ESLint flat config, no Prettier, no `.editorconfig`
**Severity:** P1     **Stage:** 4
**Where:** Repo root. `eslintConfig` is inline in `package.json` and only extends `react-app` (CRA preset).
**Finding:** No formatting consistency, no pre-commit lint, no Prettier.
**Recommendation:** Stage 4 adds `eslint.config.js` (flat config), `.prettierrc`, `.editorconfig`, plus npm scripts `lint`, `lint:fix`, `format`. Defer to Stage 4 because formatting churn would noise up the Stage 3 rename/migration diffs.

### F-11 — No GitHub Actions CI
**Severity:** P1     **Stage:** 4
**Where:** No `.github/workflows/`.
**Finding:** Nothing enforces the build, tests, or lint on PRs.
**Recommendation:** Stage 4 adds `.github/workflows/ci.yml`: install → typecheck → unit tests → build → Playwright smoke (against the containerized app via `restart.sh NO_WATCH=1`).

### F-12 — `REACT_APP_SERVICE_URI` in `api-client.tsx`
**Severity:** P1     **Stage:** 3
**Where:** `src/api/api-client.tsx:2` — `process.env.REACT_APP_SERVICE_URI`.
**Finding:** CRA env convention; Vite uses `import.meta.env.VITE_*`.
**Recommendation:** During the Stage 3 Vite migration, rewrite to `import.meta.env.VITE_SERVICE_URI`, update `.env*` filenames to drop the `REACT_APP_` prefix. Default fallback `http://localhost:4133/` is preserved.

### F-13 — Deprecated `ReactDOM.render` in `index.tsx`
**Severity:** P1     **Stage:** 3
**Where:** `src/index.tsx:6-10`.
**Finding:** React 18 logs a deprecation warning; concurrent features are unavailable. Replace with `createRoot` from `react-dom/client`.
**Recommendation:** Stage 3 update (paired with Vite migration so the React import path doesn't get touched twice).

### F-14 — `@types/react@^17` with React 18
**Severity:** P1     **Stage:** 3
**Where:** `package.json` — `"@types/react": "^17.0.43"`, `"@types/react-dom": "^17.0.14"`, `"react": "^18.0.0"`.
**Finding:** Type definitions lag the runtime. Some React 18 APIs (`useId`, `createRoot`, transition hooks) lack proper types or carry the wrong signatures.
**Recommendation:** Bump both to `^18.x` in Stage 3 alongside F-13.

### F-15 — `@types/*` in `dependencies` instead of `devDependencies`
**Severity:** P2     **Stage:** 3
**Where:** `@types/file-saver`, `@types/jest`, `@types/node`, `@types/react`, `@types/react-dom` all in `dependencies`.
**Finding:** Cosmetic. Inflates production install size on deployed bundlers that don't tree-shake, and is just wrong on principle.
**Recommendation:** Move to `devDependencies` during the Stage 3 package.json rewrite.

### F-16 — Package name `arkada-react` (typo)
**Severity:** P1     **Stage:** 3 (already scheduled)
**Where:** `package.json` line 2.
**Finding:** Already covered by the existing Stage 3 plan — rename to `axonometra-core@0.1.0`.

### F-17 — Upstream binary blobs in `public/`
**Severity:** P2     **Stage:** 3
**Where:** `public/`. Confirmed-unused (zero references in `src/`):
  - `armchair.fbx`, `armchair.mtl`, `armchair.obj` (3D model files — upstream thesis era)
  - `m.azw3` (Kindle e-book — upstream thesis artifact)
  - `logo-min.png`, `sofa.svg`, `background-pattern.svg` (only referenced in commented-out lines in `src/editor/editor/objects/assets.ts`)

**KEEP:** `pattern.svg` — actively used at `src/editor/editor/Main.ts:43` (`TilingSprite.from("./pattern.svg", ...)`).

**Recommendation:** Stage 3 deletes the unused files in a single `chore: remove upstream binary blobs` commit. `pattern.svg` stays.

### F-18 — `docs/Docs - Bachelor's thesis.pdf`
**Severity:** P2     **Stage:** 3
**Where:** `docs/Docs - Bachelor's thesis.pdf` (3.1 MB, sole content of `docs/`).
**Finding:** Upstream author's thesis. Not relevant to axonometra; bloats the repo and clones.
**Recommendation:** Delete in Stage 3 along with the `docs/` directory. README's Apache-2.0 attribution preserves credit to the upstream author and links to the upstream repo where the thesis remains available.

### F-19 — `.idea/` is committed; `.idea/arcada.iml` carries old name; `.idea/` is not in `.gitignore`
**Severity:** P2     **Stage:** 3
**Where:** `.idea/arcada.iml`, `.idea/modules.xml`, `.idea/vcs.xml`. The `.iml` is a 336-byte stock IntelliJ module file with no project-specific content.
**Finding:** Personal IDE config doesn't belong in the repo. Per JetBrains' own gitignore template, `.idea/` should be excluded. `arcada.iml` is the only filename with our pre-rename string outside the source.
**Recommendation:** Stage 3 adds `.idea/` to `.gitignore` and removes the directory from the index (`git rm -rf --cached .idea/`). Two commits: one for `.gitignore`, one for the removal, so the diff is reviewable.

### F-20 — Hardcoded "arcada" strings (3 files; F-16 covers package.json)
**Severity:** P1     **Stage:** 3 (already scheduled)
**Where:**
  - `public/index.html` — `<title>Arcada</title>` (line 27)
  - `src/ui/WelcomeModal.tsx` — "Welcome to Arcada! 🎉" notification, `import ArcadaLogo from '../res/logo.png'`
  - `src/ui/Layout/PageLayout.tsx` — `import ArcadaLogo from '../../res/logo.png'` (Image use is commented out), "Arcada is currently only intended for desktops" comment

**Note:** Both `ArcadaLogo` imports resolve to `src/res/logo.png` — a generic filename, no asset file rename needed. Just rename the import alias to `AxonometraLogo`.

**Recommendation:** Stage 3's existing rename task is correct; the original plan's mention of an asset file rename is unnecessary. Update the plan's Stage 3 detail.

### F-21 — `WelcomeModal` "desktop only" gate
**Severity:** P2     **Stage:** 4
**Where:** `src/ui/WelcomeModal.tsx` and `src/ui/Layout/PageLayout.tsx` (commented-out conditional rendering on `isMobile`).
**Finding:** Upstream restricts the app to desktops via `react-device-detect`. axonometra's roadmap likely wants tablet support at minimum (for healthcare-facility floor planning).
**Recommendation:** Stage 4 design pass — revisit pointer/touch handling in the Pixi layer; remove the gate once tested.

---

## Stage 1 follow-ups

Items the audit revealed about already-shipped Stage 1 work:

- **README wording.** Stage 1 README says license is "inherited (MIT)" from upstream. Actual upstream is Apache-2.0; we're relicensing, not inheriting. The wording fix is bundled into the F-02 commit in Stage 3 (single commit changes `LICENSE` and the two README mentions together).

No other Stage 1 amendments are required.

---

## Container scaffolding notes

The Stage 2 transitional `Dockerfile`, `docker/nginx.conf`, `.dockerignore`, and `restart.sh` are committed as Stage 2 artifacts. Stage 3 will revise them as follows:

- `Dockerfile`: swap `npm run build` → `vite build`, and `/app/build` → `/app/dist` for the COPY into nginx.
- `nginx.conf`: no changes expected; SPA fallback applies regardless of build tool.
- `.dockerignore`: add `coverage/` once Vitest is configured; remove `LICENSE` exclusion if we want the licence shipped inside the image (not strictly needed for nginx-served SPA, can stay excluded).
- `restart.sh`: no changes expected.

These four files are not throwaway — they form the production-shaped container that Stage 3 inherits.

---

## What this review unlocks

The Stage 3 entry sub-task list, in execution order, is now:

1. F-01 — fix the `WALL_THICKNESS` import; rebuild via `restart.sh` to capture a working baseline screenshot before any rename.
2. F-16, F-20 — rename `arcada` → `axonometra` throughout source + `package.json` to `axonometra-core@0.1.0`.
3. F-02 — relicense to MIT with attribution; update README wording.
4. F-17, F-18, F-19 — delete upstream binary blobs, `docs/`, and the `.idea/` directory; add `.idea/` to `.gitignore`.
5. F-05, F-06, F-15 — clean dependencies (remove `three`, `pixi-bump`, `pixi-plugin-bump`; move `@types/*` to devDeps).
6. F-12, F-13, F-14 — Vite env migration, `createRoot`, `@types/react@18`.
7. F-03, F-08 (partial) — CRA → Vite + Vitest migration; tsconfig refresh (TS 5.x, `moduleResolution: bundler`, `target: ESNext`); update `Dockerfile` build step accordingly.
8. F-09 (partial) — Playwright smoke against the container.
9. F-07 — `npm audit fix` against the post-migration tree.
10. Tag `v0.1.0`.

Stage 4's entry list is F-04 (Pixi v6→v8), F-08 (strict mode), F-09 (test expansion), F-10 (lint/format), F-11 (CI), F-21 (responsiveness), plus whatever survives Stage 3.
