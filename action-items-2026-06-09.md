# Axonometra Action Items — 2026-06-09

Derived from [code-review-2026-06-09.md](./code-review-2026-06-09.md). Items are listed in execution order: Critical first, then High, then Medium grouped by theme, then Low. Each item is independently actionable and references its finding in the review by appendix number (e.g. `#4` → row 4 of the Appendix Finding Summary Table) and originating section.

Priority key: 🔴 Critical | 🟠 High | 🟡 Medium | 🟢 Low

---

## 🔴 Critical (do first)

_None._ The review surfaced nine 🟠 High findings but no 🔴 Critical issues that demand immediate action ahead of all other work. Start with the High items below.

---

## 🟠 High (do before next release)

### ~~1. Rotate the GitHub PAT embedded in the local `.git/config` remote URL~~
- **Why:** A fine-grained PAT is currently embedded in the local `origin` URL. It is not committed to the repo (verified: `git log -S "github_pat_"` is empty), but it is exposed to any tool that reads the local clone — CI runners, agents, log shippers, this review.
- **What:** (1) Revoke the existing PAT on GitHub. (2) `git remote set-url origin https://github.com/qant-au/axonometra.git`. (3) Use `gh auth login` or the OS credential helper to supply the token at push time. Purely a local-machine action; nothing in the repository changes.
- **Refs:** Review #3 (Section 2c)

### ~~2. Validate and harden `FloorPlan.load` input~~
- **Why:** `JSON.parse(planText)` runs on raw user-supplied file contents (and on `localStorage.getItem('autosave')` which can be `null`) with no schema validation, no `__proto__` filter, and no try/catch. A null autosave on first load is a guaranteed crash from the welcome modal's "Load from local save" button. A malicious plan file can prototype-pollute the page.
- **What:** (a) Wrap `JSON.parse` in try/catch and surface a Mantine error notification on failure. (b) Use a reviver to strip `__proto__` / `constructor` / `prototype` keys, or move to a real schema validator (zod / valibot) over `FloorPlanSerializable`. (c) Guard `WelcomeModal.tsx:96` against `null` from `localStorage.getItem('autosave')`. (d) Add a `version` field to `FloorPlanSerializable` (links to action item 19).
- **Where:** `src/editor/editor/objects/FloorPlan.ts:81-92`, `src/ui/WelcomeModal.tsx:96`, `src/editor/editor/persistence/FloorPlanSerializable.ts`
- **Refs:** Review #1 (Section 2a)

### ~~3. Resolve the broken-by-design dependency on the upstream arcada-backend~~
- **Why:** Five fetch families (`categories`, `category/:id`, `wall/window`, `wall/door`, `2d/:imagePath`) target an Express server that this fork does not ship. Furniture, doors, and windows do not work out of the box. The Playwright smoke test allowlists the connection-refused errors to pass.
- **What:** Pick one path: (a) inline a static furniture/door/window manifest as JSON in `src/res/` and replace the fetch layer with imports; (b) publish a minimal companion backend in a sister repo or `backend/`; (c) delete the network layer and ship a hardcoded list of door/window types with furniture deferred. (a) is the lowest cost. Whichever you pick, update README to match (links to action item 9).
- **Where:** `src/api/api-client.tsx`, `src/stores/FurnitureStore.tsx`, `src/editor/editor/objects/Walls/Wall.ts:189,202`, `src/editor/editor/objects/Furniture.ts:29`, `src/ui/FurnitureControls/FurnitureAddPanel/FurnitureItem.tsx:22`
- **Refs:** Review #9 (Section 11a)

### ~~4. Document the upstream-backend gap in README~~
- **Why:** Tactical version of action item 3 — until the backend gap is closed, contributors cloning the repo see a broken app and have no idea why.
- **What:** Add a paragraph to README under "Status" or a new "Known limitations" section explaining that furniture/door/window placement requires the upstream `arcada-backend` Express server at `http://localhost:4133/`, that this server is not included, and pointing at the TODO that tracks the fix.
- **Where:** `README.md`
- **Refs:** Review #8 (Section 5)

### ~~5. Decide and implement the embedding story (or walk back the README claim)~~
- **Why:** README pitches Axonometra as a "browser-embeddable plan editor". The code has zero `postMessage` calls, no URL-parameter loader, no embedding API. The nginx config actively blocks cross-origin iframes (`X-Frame-Options: SAMEORIGIN`). The product positioning is materially ahead of the implementation.
- **What:** Either (a) implement a minimum embedding surface — `postMessage({type:'axo:load', plan})` and `postMessage({type:'axo:request-save'})` reply, optional URL parameter for read-only render, CSP `frame-ancestors` allowlist — plus a new `EMBEDDING.md`; or (b) remove the embeddability language from README/site until the work is scheduled.
- **Where:** new `src/embed/` module (if implementing), `docker/nginx.conf`, `README.md`, new `EMBEDDING.md`
- **Refs:** Review #2 (Section 2b)

### ~~6. Stop redrawing every wall on every `mousemove`~~
- **Why:** `WallNodeSequence` subscribes to its own `mousemove` and calls `drawWalls()` — full clear + redraw + label update for every wall on every pointer move, in every tool mode, including View. Already-mutating paths (`addNode`, `addWall`, `removeWall`, `WallNode.setPosition`) call `drawWalls()` explicitly, so the subscription is redundant in mutating paths and wasteful in non-mutating paths.
- **What:** Delete `this.on('mousemove', this.drawWalls);` at line 20 of `WallNodeSequence.ts`. Verify the existing mutating callers still trigger redraws.
- **Where:** `src/editor/editor/objects/Walls/WallNodeSequence.ts:20`
- **Refs:** Review #4 (Section 3a)

### ~~7. Fix singleton + global-handler lifecycle around `EditorRoot` unmount~~
- **Why:** `app.destroy(true, true)` on unmount tears down the Pixi scene, but the module-level singletons (`FloorPlan.Instance`, `TransformLayer.Instance`, `AddWallManager.Instance`, the static `WallNodeSequence.wallNodeId`, the exported `let main: Main`, the static `Main.viewportPluginManager`/`Main.app`) still reference the destroyed scene. The `document.onkeydown = ...` assignment in `Main.ts` is never removed and is a property assignment rather than a listener, so re-mounting overwrites whatever was there. React 18 StrictMode double-mount, HMR, and any conditional rendering of `<EditorRoot/>` (including embedded use cases) hit this.
- **What:** (1) Convert `let main: Main` export to a context/store value, set in effect and torn down in cleanup. (2) Add `dispose()` methods to the singletons that reset their internal state and the static counter. (3) Replace `document.onkeydown = handler` with `addEventListener('keydown', handler)` + `removeEventListener` paired with the effect cleanup. (4) Replace `app.view.oncontextmenu = ...` with `addEventListener('contextmenu', ...)` in the same pattern (links to action item 53).
- **Where:** `src/editor/EditorRoot.tsx`, `src/editor/editor/Main.ts:124-140`, `src/editor/editor/objects/FloorPlan.ts`, `src/editor/editor/objects/TransformControls/TransformLayer.ts`, `src/editor/editor/actions/AddWallManager.ts`, `src/editor/editor/objects/Walls/WallNodeSequence.ts:11`
- **Refs:** Review #5 (Section 3a)

### ~~8. Guard `HelpDialog` against `Tool.FurnitureAdd`~~
- **Why:** `HelpDialog` populates `helpBody` for seven of the eight `Tool` enum members but not `Tool.FurnitureAdd`. Render reads `helpBody[activeTool].title` — if `activeTool` ever takes that value, the page crashes. Currently no code path sets it, but the value is reachable from external state mutation, future code, or a malicious plan file.
- **What:** Either (a) populate `helpBody[Tool.FurnitureAdd]` with a sensible fallback, (b) delete `Tool.FurnitureAdd` from the enum if truly dead (search `grep -rn "Tool.FurnitureAdd[^WD]"`), or (c) guard the render: `const body = helpBody[activeTool]; if (!body) return null;`.
- **Where:** `src/ui/HelpDialog.tsx:35-156`, `src/editor/editor/constants.ts:36-44`
- **Refs:** Review #6 (Section 4a)

### ~~9. Complete `strictNullChecks: true` (axo-015)~~
- **Why:** This is the largest hole in the type system. Several findings in this review (HelpDialog null index, WallNodeSequence.remove map.get crash, LoadAction parsing null, `useRef` nullability) are direct consequences. Stage 5 has it scoped.
- **What:** Per the existing TODO `axo-015` note: ~56 sites where Pixi parent chains are passed around without null guards. Real refactor, not mechanical.
- **Where:** `tsconfig.json:9` flip to `true`, then walk the resulting compile errors.
- **Refs:** Review #7 (Section 4b) (recurring — first seen STAGE2-REVIEW.md F-08). See also: TODO.md — `@id(axo-015)`.

---

## 🟡 Medium — Security hardening

### ~~10. Add a Content-Security-Policy header to nginx config~~
- **Status:** ✅ Implemented in `docker/nginx.conf:47,57,65` (header repeated in default / asset / index.html locations). `connect-src` is `'self'` only — the upstream backend dependency was resolved by inlining a static catalog (action item 3).
- **What:** Add `default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self' http://localhost:4133; frame-ancestors 'self';` (or the allowlist that matches the eventual embedding story). Mantine 4 + Emotion requires `'unsafe-inline'` for styles.
- **Where:** `docker/nginx.conf:38-42` (and the same block repeated in the asset / index.html locations)
- **Refs:** Review #12 (Section 2b)

### ~~11. Replace `X-Frame-Options: SAMEORIGIN` with CSP `frame-ancestors`~~
- **Status:** ✅ Implemented. `X-Frame-Options` is removed from `docker/nginx.conf` and `frame-ancestors 'self'` is set inside the CSP at lines 47, 57, 65. Allowlist additions go in the same header.
- **What:** Once CSP is in (action 10), drop the legacy `X-Frame-Options` and set `frame-ancestors` to the actual allowlist of embedder origins.
- **Where:** `docker/nginx.conf:41, 51, 59`
- **Refs:** Review #13 (Section 2b)

### ~~12. Validate `data.imagePath` before interpolating into URLs~~
- **What:** Allowlist alphanumerics + `.`, `_`, `-`. Reject `:` and `//`. Apply on `Texture.from(...)` and the React `<Image src>` path.
- **Where:** `src/editor/editor/objects/Furniture.ts:29`, `src/ui/FurnitureControls/FurnitureAddPanel/FurnitureItem.tsx:22`
- **Refs:** Review #11 (Section 2a)

---

## 🟡 Medium — Performance

### ~~13. Configure code-splitting in `vite.config.mts`~~
- **What:** Add `build.rollupOptions.output.manualChunks = { pixi: ['pixi.js','pixi-viewport'], mantine: ['@mantine/core','@mantine/hooks','@mantine/notifications','@mantine/dropzone'], react: ['react','react-dom'] }`. Add `React.lazy()` boundaries around `FurnitureAddPanel` and `HelpDialog` with a `<Suspense>` fallback.
- **Where:** `vite.config.mts`, `src/ui/Layout/ToolNavbar.tsx` (drawer's FurnitureAddPanel), `src/ui/Layout/ToolNavbar.tsx` and/or `src/ui/HelpDialog.tsx`
- **Refs:** Review #23 (Section 3c)

### ~~14. Move help GIFs out of the JS bundle~~
- **What:** Move `src/res/*.gif` to `public/help/*.gif` and reference them via plain URL strings in `HelpDialog`. Long-term: convert the 478 KB `edit-furniture.gif` to WebM / MP4.
- **Where:** `src/res/*.gif` → `public/help/*.gif`; `src/ui/HelpDialog.tsx:19-25`
- **Refs:** Review #24 (Section 3c)

### ~~15. Stop reinstantiating `autoDetectRenderer` per print and null-check the popup~~
- **What:** In `FloorPlan.print()`: set explicit width/height matching plan bounds, call `renderer.destroy(true)` after extracting, null-check `window.open()` result and surface a notification on popup-blocker. Consider switching to canvas-blob + `<a download>` to eliminate the popup dependency.
- **Where:** `src/editor/editor/objects/FloorPlan.ts:63-74`
- **Refs:** Review #17 (Section 3a)

### ~~16. Remove the no-op `this.parent = attachedTo` assignment~~
- **What:** Delete line 36 of `Furniture.ts`. The follow-up `addChild` calls in `Floor.ts:54, 136` set the parent correctly.
- **Where:** `src/editor/editor/objects/Furniture.ts:36`
- **Refs:** Review #18 (Section 3a)

### ~~17. Drop `useStore()` / `useStyles()` no-op subscriptions in `EditorRoot`~~
- **Status:** ✅ Implemented. The singleton-lifecycle rewrite (commit `6d2b310`) replaced `EditorRoot.tsx`; the no-op subscriptions and the misleading comment are gone.
- **What:** Delete the `useStore();` call at line 20 and the `useStyles();` call (`useStyles`'s `inactive` class is never read). Remove the misleading comment about "side-effect subscriptions".
- **Where:** `src/editor/EditorRoot.tsx:9-13, 20`
- **Refs:** Review #20 (Section 3b)

### ~~18. Hoist `createStyles` out of the `WelcomeModal` component body~~
- **What:** Move `const useStyles = createStyles(...)` to module scope, matching every other component file.
- **Where:** `src/ui/WelcomeModal.tsx:19-23`
- **Refs:** Review #21 (Section 3b)

### ~~19. Address the two `react-hooks/exhaustive-deps` warnings~~
- **What:** Either move the Zustand action calls inside the effect to `useStore.getState().X(...)` (avoiding the dep), or comment why the suppression is safe with an explicit eslint-disable.
- **Where:** `src/App.tsx:12`, `src/ui/FurnitureControls/FurnitureAddPanel/FurnitureAddPanel.tsx:32`
- **Refs:** Review #22 (Section 3b)

### ~~20. Audit `useDefineForClassFields` interaction with Pixi during v8 migration~~
- **Status:** ✅ Tracked. The audit note is folded into `TODO.md` axo-008 (Pixi v6→v8 migration); it fires when the migration starts. No standalone action required now.
- **What:** During axo-008, verify all `Container`/`Graphics` subclasses initialise correctly. If undefined inherited fields appear, flip `useDefineForClassFields: false`.
- **Where:** `tsconfig.json:23` (revisit)
- **Refs:** Review #19 (Section 3a). _Confidence: Low — no observable failure today, but a known interaction worth tracking._

---

## 🟡 Medium — Code health & TypeScript

### ~~21. Stop exporting `main: Main` as a mutable module-level variable~~
- **Status:** ✅ Implemented. `EditorRoot.tsx:14-24` uses a `mainHolder: { current: Main | null }` ref-shaped object plus a `getMain()` accessor; the effect sets `mainHolder.current = main` on mount and clears it on cleanup. The non-React consumers (`ViewportCoordinates.ts:1`, `Floor.ts:6`) import `getMain` instead of a mutable export. The test-time `vi.mock` in `ViewportCoordinates.test.ts:8-13` is retained intentionally — moving `Main` into Zustand would conflict with item 25's plan to remove model state from the store-equivalent layer.
- **What:** Wrap `Main` in a React context (`EditorContext`) or store it in the Zustand store. Update consumers (`src/helpers/ViewportCoordinates.ts`, `src/editor/editor/objects/Floor.ts:140`). Removes the test-time `vi.mock(...)` workaround.
- **Where:** `src/editor/EditorRoot.tsx:14`, `src/helpers/ViewportCoordinates.ts:1`, `src/editor/editor/objects/Floor.ts:6`
- **Refs:** Review #28 (Section 4b)

### ~~22. Pull magic numbers into named constants~~
- **Status:** ✅ Implemented. `constants.ts` now exports `SNAP_THRESHOLD`, `MISCLICK_THRESHOLD`, `WALL_COLOR`, `NODE_COLOR`, `HANDLE_MOBILE_SCALE`, `LABEL_FONT`, `LABEL_FONT_SIZE`, `LABEL_COLOR`. Inline numerics replaced at `AddWallManager.ts:34/48`, `Floor.ts:242/254`, `Wall.ts:115`, `WallNode.ts:41`, `Handle.ts:70`, `Label.ts:8-10`.
- **What:** Extend `src/editor/editor/constants.ts` (or add `src/editor/editor/theme.ts`) with `SNAP_THRESHOLD = 0.3 * METER`, `MISCLICK_THRESHOLD = 0.2 * METER`, `WALL_COLOR = 0x1a1a1a`, `NODE_COLOR = 0x222222`, `HANDLE_SIZE = 10`, `HANDLE_MOBILE_SCALE = 2.5`, `LABEL_FONT = 'Arial'`, `LABEL_FONT_SIZE = 16`, `MEASURE_LINE_WIDTH = 2`, etc. Replace inline numerics.
- **Where:** Listed in detail in the review under finding #25.
- **Refs:** Review #25 (Section 4a)

### ~~23. Refactor `Furniture.switchOrientation` and `setOrientation` to share logic~~
- **Status:** ✅ Implemented. `Furniture.applyStep(fromOrientation, useWidthForDoorOffset)` carries the anchor/scale flip and the door y-offset; `switchOrientation` calls it once per right-click, `setOrientation(n)` loops it `n` times on load. The width-vs-height divergence in the door offset is preserved behind the `useWidthForDoorOffset` flag with a comment flagging it for a follow-up investigation.
- **What:** Extract a single `applyStep(currentOrientation, resourcePath, target)` helper; both methods call it.
- **Where:** `src/editor/editor/objects/Furniture.ts:64-136`
- **Refs:** Review #26 (Section 4a)

### ~~24. Guard `WallNodeSequence.remove` against missing map entries~~
- **Status:** ✅ Implemented. The guard exists at `WallNodeSequence.ts:76-77` (`const ownLinks = this.wallNodeLinks.get(id); if (!ownLinks) return;`). Closed by axo-015 (strictNullChecks rollout).
- **What:** `const links = this.wallNodeLinks.get(id); if (!links) return;` before the `.length` access; similar guards on the iteration branch.
- **Where:** `src/editor/editor/objects/Walls/WallNodeSequence.ts:76-106`
- **Refs:** Review #27 (Section 4a)

### ~~25. Plan the `FloorPlan` refactor (Stage 6+ scoping)~~
- **Status:** ✅ Implemented. `TODO.md` Stage 6 carries axo-020 — extract the model into a Zustand store (`useFloorPlanStore`), keep `FloorPlan` as a thin Pixi container, drop the static `Instance`/`dispose` pair. Prerequisite axo-008 documented.
- **Why:** `FloorPlan` is simultaneously a Pixi container, the model store, a singleton, and the persistence layer. Three jobs in one class — the root cause of the singleton-lifecycle issues from action item 7. Too big for Stage 5.
- **What:** Document a Stage 6+ initiative: extract the model into a Zustand store; `FloorPlan` becomes a thin Pixi container that subscribes.
- **Where:** `src/editor/editor/objects/FloorPlan.ts` (refactor target); add a `TODO.md` entry under Stage 6.
- **Refs:** Review #29 (Section 4c)

### ~~26. Add unit-test coverage for the editor engine~~
- **Status:** ✅ Implemented. New `src/test/pixiMock.ts` (minimal Container/Graphics/Sprite/Text/TextStyle/Texture stub) plus four spec files under `src/editor/editor/__tests__/`: `FloorPlanSerializable.test.ts` (parse + validate), `Serializer.test.ts` (serialize round-trip), `AddWallManager.test.ts` (checkStep snap/reject), `WallNodeSequence.test.ts` (addNode/addWall/remove/removeWall/load/reset). Suite grew from 23 to 56 tests, all green. `Floor.addNodeToWall` left for a follow-up — Pixi mock would need to model the full Floor + Wall + Furniture child graph.
- **What:** Use a minimal Pixi stub (Container/Graphics mock recording calls) under jsdom. Cover `WallNodeSequence` (addNode/addWall/remove/removeWall/load), `AddWallManager.checkStep`, `Floor.addNodeToWall` misclick guards, `Serializer.serialize` + `FloorPlan.load` round-trip.
- **Where:** `src/editor/editor/__tests__/` (new directory)
- **Refs:** Review #30 (Section 4d)

### ~~27. Add a critical-flow Playwright spec~~
- **Status:** ✅ Implemented. `e2e/place-wall.spec.ts` drives the canvas via `page.mouse.click` against three positions, places two walls, asserts node/wall counts via a dev-only `window.__axo` introspection handle exposed by `EditorRoot.tsx`, validates Ctrl+S writes the plan to `localStorage` with `version: 1`, and round-trips the save through a page reload + "Load from local save". Verified green against `npm run dev` on :4891. Skips automatically when `__axo` is absent (prod builds).
- **What:** New `e2e/place-wall.spec.ts` driving canvas clicks via `page.mouse.click`, validating Save downloads via `page.waitForEvent('download')`, and a load round-trip.
- **Where:** `e2e/place-wall.spec.ts` (new)
- **Refs:** Review #31 (Section 4d)

### ~~28. Create `.env.example`~~
- **Status:** ✅ Implemented. `.env.example` exists and documents `VITE_EMBED_ALLOWED_ORIGINS` — the actual env var consumed at `src/embed/embedConfig.ts:19`. (The review's `VITE_SERVICE_URI` note was stale; the original `API_URL` backend var died when the catalog was inlined per item #3.)
- **What:** Document `VITE_SERVICE_URI` (currently the only env var) with a comment explaining its purpose and optionality.
- **Where:** `.env.example` (new)
- **Refs:** Review #32 (Section 4e)

---

## 🟡 Medium — Testing, build & deployment

### ~~29. Add Playwright to CI (TODO axo-017)~~
- **What:** Per the existing TODO note: containerised via `restart.sh NO_WATCH=1`, once the rest of the CI workflow has had a green run.
- **Where:** `.github/workflows/ci.yml`
- **Refs:** Review #36 (Section 7) (recurring — TODO axo-017)

---

## 🟡 Medium — Documentation

### ~~30. Update README to reflect post-Stage-4 reality~~
- **What:** Rewrite Status (v0.2.0 — Stage 4 complete; Stage 5 in progress), Tech stack (drop "migrating to Vite"; say "Vite + Vitest"), and Quick start (`npm install && npm run dev`). Reference `restart.sh` and `npm run test:e2e`.
- **Where:** `README.md:14-16, 38, 42-47`
- **Refs:** Review #10 (Section 1)

### ~~31. Add `CONTRIBUTING.md`~~
- **What:** Dev setup, lint/format expectations, commit conventions (Conventional Commits), PR process, question channels. ~50 lines.
- **Where:** `CONTRIBUTING.md` (new)
- **Refs:** Review #33 (Section 5)

### ~~32. Document the plan file format~~
- **What:** Create `PLAN-FORMAT.md` with the JSON schema, annotated example, and version notes. Or add a `$schema` field pointing at a JSON Schema file in `src/editor/editor/persistence/`.
- **Where:** `PLAN-FORMAT.md` (new), `src/editor/editor/persistence/FloorPlanSerializable.ts`
- **Refs:** Review #34 (Section 5)

### ~~33. Document the embedding contract (or remove the README claim)~~
- **What:** Tied to action item 5. If you implement embedding, document it in `EMBEDDING.md` with an example HTML page that iframes Axonometra and round-trips a plan.
- **Where:** `EMBEDDING.md` (new) or `README.md` walkback
- **Refs:** Review #35 (Section 5)

---

## 🟡 Medium — Accessibility

### ~~34. Add keyboard accessibility — document the limitation and improve navbar focus~~
- **What:** Document the canvas-is-pointer-only limitation under a README "Accessibility" section. Verify Mantine `UnstyledButton` shows a visible focus ring; add a custom focus style if not. Long term, plan a Stage 6+ keyboard-navigation feature for the canvas.
- **Where:** `README.md`, possibly `src/ui/NavbarLink.tsx`
- **Refs:** Review #37 (Section 8)

### ~~35. Add `aria-label` to icon-only navbar buttons~~
- **What:** Add `aria-label={label}` to the `UnstyledButton` in `NavbarLink.tsx`. One-line fix.
- **Where:** `src/ui/NavbarLink.tsx:53-60`
- **Refs:** Review #38 (Section 8)

### 36. Decide on the mobile/touch UX (axo-014)
- **What:** Per the existing TODO note — pointer/touch handling pass in the Pixi layer; remove or restore the `WelcomeModal` desktop-only gate based on that decision.
- **Where:** `src/ui/PageLayout.tsx:7-20`, `src/editor/editor/objects/Walls/WallNode.ts:20-24`, `src/editor/editor/objects/TransformControls/Handle.ts:64-66`
- **Refs:** Review #39 (Section 8) (recurring — first seen STAGE2-REVIEW.md F-21). See also: TODO.md — `@id(axo-014)`.

---

## 🟡 Medium — OSS hygiene

### ~~37. Bump `package.json` version to `0.2.0` and close axo-013~~
- **What:** `npm version 0.2.0 --no-git-tag-version` (the git tag already exists). Mark `axo-013` complete in `TODO.md`.
- **Where:** `package.json:3`, `TODO.md` (axo-013)
- **Refs:** Review #40 (Section 9)

### ~~38. Add `CHANGELOG.md`~~
- **What:** Adopt Keep-a-Changelog format. Retroactively document v0.1.0 (rename + Vite + container + smoke) and v0.2.0 (lint/format/CI/strict TS/unit tests).
- **Where:** `CHANGELOG.md` (new)
- **Refs:** Review #41 (Section 9)

### ~~39. Add `SECURITY.md`~~
- **What:** Supported versions, reporting channel (email or GitHub private vulnerability reporting), expected response time, in-scope (SPA bundle) / out-of-scope (upstream arcada-backend).
- **Where:** `SECURITY.md` (new)
- **Refs:** Review #42 (Section 9)

---

## 🟡 Medium — Schema versioning

### ~~40. Add a `version: 1` field to `FloorPlanSerializable`~~
- **What:** Add `version: 1` to the class. `FloorPlan.load` reads the version, defaults to 1 if missing, and routes to per-version migration functions (none today; the structure for future migrations).
- **Where:** `src/editor/editor/persistence/FloorPlanSerializable.ts:3-11`, `src/editor/editor/objects/FloorPlan.ts:81-92`
- **Refs:** Review #43 (Section 11b)

---

## 🟡 Medium — Dependency upgrades (Stage 5 queued)

### 41. Pixi.js 6 → 8 migration (TODO axo-008)
- **What:** Per the existing TODO note: ladder via v7. Bump `pixi-viewport` in lockstep. Stage 4 test net + CI cover regressions; expand Playwright coverage first (action item 27).
- **Where:** `package.json:14-15`; engine code (most of `src/editor/editor/`)
- **Refs:** Review #14 (Section 2d) (recurring — STAGE2-REVIEW.md F-04). See also: TODO.md — `@id(axo-008)`.

### 42. Mantine 4 → 9 + Zustand 3 → 5 (TODO axo-016)
- **What:** Per the existing TODO note: breaking UI/store API changes. UI surface is small (~7 components). Migrate `createStyles` calls. Switch Zustand imports to named.
- **Where:** `package.json:9-12, 20`; `src/ui/**`, `src/stores/**`, `src/editor/EditorRoot.tsx:6-13`
- **Refs:** Review #15, #16 (Section 2d). See also: TODO.md — `@id(axo-016)`.

---

## 🟢 Low (do when convenient)

### ~~43. Delete `src/App.css` and its import~~
- **Where:** `src/App.tsx:2`, `src/App.css` (delete)
- **Refs:** Review #44 (Section 1)

### ~~44. Validate file inputs on size and MIME type~~
- **What:** `accept=".json,application/json,text/plain"`, reject files > 5 MB before reading, toast on rejection.
- **Where:** `src/ui/WelcomeModal.tsx:79-84`, `src/ui/Layout/ToolNavbar.tsx:333-339`
- **Refs:** Review #45 (Section 2a)

### ~~45. Delete committed `.env` and add to `.gitignore`~~
- **What:** `git rm .env`, add `.env` (bare) to `.gitignore`. Recreate as `.env.example` (action item 28).
- **Where:** `.env` (delete), `.gitignore`
- **Refs:** Review #46 (Section 2c)

### 46. Accept the residual `npm audit` advisories (dev-only)
- **What:** No action; document in `SECURITY.md` (action item 39) that production deploy is unaffected. Revisit on the next Vite/Vitest major bump.
- **Refs:** Review #47 (Section 2d) (recurring — STAGE2-REVIEW.md F-07)

### ~~47. Pick one `isMobile` implementation~~
- **What:** Remove `react-device-detect` from `package.json`. Replace its three call sites with Pixi's `isMobile` or `window.matchMedia('(pointer: coarse)')`.
- **Where:** `package.json:17`; `src/editor/editor/objects/Walls/WallNode.ts:9, 20`; `src/editor/editor/objects/TransformControls/Handle.ts:2, 64`; remove from `package.json`
- **Refs:** Review #48 (Section 2d)

### ~~48. Improve `SaveAction` filename and MIME~~
- **What:** `type: 'application/json'`, filename `axonometra-plan-YYYY-MM-DD-HHmm.json`.
- **Where:** `src/editor/editor/actions/SaveAction.ts:13-14`
- **Refs:** Review #49 (Section 2e)

### ~~49. Align Node version across Dockerfile, CI, and a new `.nvmrc`~~
- **What:** Pick Node 22 (current LTS). Update `Dockerfile:12`, `.github/workflows/ci.yml:21` (or use `node-version-file: .nvmrc`), add `.nvmrc` with `22`.
- **Where:** `Dockerfile:12`, `.github/workflows/ci.yml:21`, `.nvmrc` (new)
- **Refs:** Review #50, #76, #79 (Sections 2f, 6, 7)

### 50. Defer brotli compression decision
- **What:** No action until code-splitting (action item 13) lands. Then consider a brotli-enabled nginx base image.
- **Refs:** Review #51 (Section 2f)

### ~~51. Add a fallback texture for failed furniture loads~~
- **What:** Add an `onerror` handler that swaps in a grey rectangle texture matching `data.width × data.height`.
- **Where:** `src/editor/editor/objects/Furniture.ts:29`
- **Refs:** Review #52 (Section 3a)

### ~~52. Simplify `FurnitureAddPanel`~~
- **What:** Delete `_availableCategories` pair. Replace `cards` state with an inline render expression.
- **Where:** `src/ui/FurnitureControls/FurnitureAddPanel/FurnitureAddPanel.tsx:22, 25-26, 35-41`
- **Refs:** Review #53 (Section 3b)

### 53. Document the source-map decision
- **What:** Leave `build.sourcemap` unset (Vite default `false`) until error tracking is wired up; then switch to `'hidden'` for upload-to-Sentry-only.
- **Refs:** Review #54 (Section 3c)

### ~~54. Update `public/manifest.json` from CRA defaults~~
- **What:** Set `short_name` to `Axonometra`, `name` to `Axonometra Floor Planner`. Verify favicon and logo PNGs are not CRA defaults.
- **Where:** `public/manifest.json`, `public/favicon.ico`, `public/logo*.png`
- **Refs:** Review #55 (Section 3c)

### ~~55. Either implement undo/redo or stop pushing to `FloorPlan.actions`~~
- **What:** Until undo is real, delete the `this.receiver.actions.push(this)` calls. Or implement a bounded undo stack (cap 100).
- **Where:** `src/editor/editor/objects/FloorPlan.ts:20`, `src/editor/editor/actions/*Action.ts`
- **Refs:** Review #56 (Section 3d)

### 56. Decide on periodic autosave
- **What:** Uncomment + tune the `setInterval(autosave, 60000)` line, or document that Ctrl+S is the only persistence path in README.
- **Where:** `src/editor/editor/Main.ts:128`
- **Refs:** Review #57 (Section 3d)

### ~~57. Delete the `console.log(this.zIndex)` debug line~~
- **Where:** `src/editor/editor/objects/Furniture.ts:141`
- **Refs:** Review #58 (Section 4a)

### ~~58. Clean up commented-out code blocks~~
- **What:** Delete the dead `src/editor/editor/objects/assets.ts`. Decide on the mobile gate (action item 36) and act on the commented block in `PageLayout.tsx:7-20`. Decide on autosave interval (action item 56). Translate or delete Romanian inline comments per action item 76.
- **Where:** `src/editor/editor/objects/assets.ts` (delete), `src/ui/Layout/PageLayout.tsx:7-20`, `src/editor/editor/Main.ts:110-112, 128`
- **Refs:** Review #59 (Section 4a)

### ~~59. Delete `Floor.clearScreen`~~
- **Where:** `src/editor/editor/objects/Floor.ts:112-116`
- **Refs:** Review #60 (Section 4a)

### ~~60. Delete `Label.toggleLabel` no-op and its subscription~~
- **Where:** `src/editor/editor/objects/TransformControls/Label.ts:27-31`
- **Refs:** Review #61 (Section 4a)

### ~~61. Type the two `e: any` file-input handlers~~
- **What:** `(e: ChangeEvent<HTMLInputElement>)`. Use `e.target.files?.[0]?.text()` for defensive access.
- **Where:** `src/ui/Layout/ToolNavbar.tsx:210`, `src/ui/WelcomeModal.tsx:25`
- **Refs:** Review #62 (Section 4a)

### ~~62. Switch `oncontextmenu` to `addEventListener`~~
- **Where:** `src/editor/EditorRoot.tsx:33-35`
- **Refs:** Review #63 (Section 4a)

### 63. Watch for `noImplicitOverride` interactions during Pixi v8 upgrade
- **What:** No action now. Track during action item 41.
- **Refs:** Review #64 (Section 4b). _Confidence: Low — TS does not currently complain._

### ~~64. Initialise refs to `null` and use optional chaining~~
- **What:** `useRef<HTMLInputElement>(null)`; callsites `fileRef.current?.click()`.
- **Where:** `src/ui/Layout/ToolNavbar.tsx:194, 329`, `src/ui/WelcomeModal.tsx:17, 87`
- **Refs:** Review #65 (Section 4b)

### ~~65. Delete the duplicate `ToolMode` enum in `constants.ts`~~
- **What:** The `ToolMode` enum at `src/editor/editor/constants.ts:29-33` is unused and has its FurnitureMode/WallMode ordinals swapped relative to the store's. Delete it.
- **Where:** `src/editor/editor/constants.ts:29-33`
- **Refs:** Review #66 (Section 4c)

### 66. Use Zustand selectors at call sites
- **What:** Refactor consumers from `const { ... } = useStore()` to `const x = useStore(s => s.x)`. Can defer to the Zustand 5 migration (action item 42).
- **Where:** `src/App.tsx:8`, `src/ui/Layout/ToolNavbar.tsx:191-192`, etc.
- **Refs:** Review #67 (Section 4c)

### ~~67. Disable `globals: true` in `vitest.config.mts`~~
- **What:** Existing tests already import explicitly; the global is unused.
- **Where:** `vitest.config.mts:8`
- **Refs:** Review #68 (Section 4d)

### ~~68. Reconsider the ESLint config-file ignore~~
- **What:** Remove or tighten `*.config.js` / `*.config.ts` from the ignores array.
- **Where:** `eslint.config.js:21-22`
- **Refs:** Review #69 (Section 4f)

### 69. Add a pre-commit hook
- **What:** `simple-git-hooks` + `lint-staged` running prettier + eslint on staged files.
- **Where:** `package.json`, `.simple-git-hooks.json` (or similar) (new)
- **Refs:** Review #70 (Section 4f)

### ~~70. Add `.prettierignore`~~
- **What:** Add `code-review-*.md`, `action-items-*.md`, `STAGE*-REVIEW.md` to keep these working documents from breaking `format:check`.
- **Where:** `.prettierignore` (new)
- **Refs:** Review #71 (Section 4f)

### ~~71. Header `STAGE2-REVIEW.md` as historical~~
- **What:** Add a one-line header pointing to the resolution status and `code-review-2026-06-09.md` as the current review.
- **Where:** `STAGE2-REVIEW.md`
- **Refs:** Review #72 (Section 5)

### 72. Migrate `tabler-icons-react` → `@tabler/icons-react`
- **What:** Bundle into action item 42 (Mantine bump).
- **Where:** `package.json:19`, all imports under `src/ui/`
- **Refs:** Review #73 (Section 6)

### 73. Consider `showSaveFilePicker` as an enhancement
- **What:** Optional. Feature-detect and use the native File System Access API where available; fall back to `file-saver`.
- **Where:** `src/editor/editor/actions/SaveAction.ts`
- **Refs:** Review #74 (Section 6). _Confidence: Low — opinion call, not a defect._

### 74. Add `npm audit` to CI
- **What:** Optional step `npm audit --audit-level=high` with `continue-on-error: true`, or use Dependabot.
- **Where:** `.github/workflows/ci.yml`
- **Refs:** Review #78 (Section 7)

### ~~75. Reference `restart.sh` in README~~
- **What:** One-paragraph mention under a "Local production preview" section.
- **Where:** `README.md`
- **Refs:** Review #80 (Section 7)

### 76. Reconsider welcome-modal Escape / outside-click behaviour
- **What:** Allow Escape / outside-click to dismiss, or add an explicit Close button. Pure UX call.
- **Where:** `src/ui/WelcomeModal.tsx:51-52`
- **Refs:** Review #81 (Section 8). _Confidence: Low — UX opinion._

### ~~77. Fix the stale-closure snap toggle notification~~
- **What:** Compute `const next = !snap;` once, use `next` for both `setSnap` and the message/icon ternary.
- **Where:** `src/ui/Layout/ToolNavbar.tsx:284-290`
- **Refs:** Review #82 (Section 8)

### 78. Add `CODE_OF_CONDUCT.md`
- **What:** Contributor Covenant 2.1 standard template; link from README.
- **Where:** `CODE_OF_CONDUCT.md` (new)
- **Status:** ⏳ Deferred to TODO `@id(axo-021)` (due 2026-08-16) — automated authoring of the standard template tripped the content filter; add manually.
- **Refs:** Review #83 (Section 9)

### ~~79. Add `.github/ISSUE_TEMPLATE/` and `PULL_REQUEST_TEMPLATE.md`~~
- **Where:** `.github/ISSUE_TEMPLATE/bug_report.md`, `.github/ISSUE_TEMPLATE/feature_request.md`, `.github/PULL_REQUEST_TEMPLATE.md` (all new)
- **Refs:** Review #84 (Section 9)

### 80. Verify the public-facing site at axonometra.com
- **What:** Manual check. Confirm the site exists, accurately reflects the project, and doesn't still say "arcada".
- **Refs:** Review #85 (Section 9). _Confidence: Low — not verifiable from the codebase._

### ~~81. Translate Romanian comments to English~~
- **What:** Chunk with other work in the affected files (e.g. axo-015 touches most of them). Don't do a dedicated translation pass.
- **Where:** `src/editor/editor/objects/Furniture.ts:12,66,159`; `src/editor/editor/objects/TransformControls/Handle.ts:107,132-148`; `src/editor/editor/objects/Floor.ts:222`; `src/editor/editor/objects/Walls/Wall.ts:117`
- **Refs:** Review #86 (Section 10)

### 82. Note the NOTICE-file check is resolved
- **What:** Documentation-only — no action required. The Apache-2.0 attribution in the LICENSE header satisfies §4 requirements; upstream has no NOTICE file to preserve.
- **Refs:** Review #87 (Section 10). _Confidence: Low — based on public-repo check that this review cannot verify offline._

### 83. Defer error-reporting / telemetry decision
- **What:** No action for v0.x. Note in roadmap.
- **Refs:** Review #88 (Section 11c). _Confidence: Low — opinion call._

### 84. Defer i18n
- **What:** No action until demand exists.
- **Refs:** Review #89 (Section 11c)

### 85. Tighten `setterAction` / `setter` typing
- **What:** Type as `Dispatch<SetStateAction<number>>` (or document the `-1 = no active mode` sentinel).
- **Where:** `src/ui/Layout/ToolNavbar.tsx:87, 217-219`
- **Refs:** Review #90 (Section 11d)

### ~~86. Consolidate snapping in `Pointer.update`~~
- **What:** Replace the inline `Math.trunc(worldX - (worldX % 10))` with a call to `snap()` from `ViewportCoordinates.ts`.
- **Where:** `src/editor/editor/Pointer.ts:14-23`
- **Refs:** Review #91 (Section 11d)

### ~~87. Auto-start the test server in `playwright.config.ts`~~
- **What:** Add a `webServer` block that runs `bash restart.sh NO_WATCH=1` (or `npm run dev`) when the baseURL isn't responding.
- **Where:** `playwright.config.ts`
- **Refs:** Review #92 (Section 11e)

---

*End of action items. See [code-review-2026-06-09.md](./code-review-2026-06-09.md) for full context, severity definitions, and the executive summary.*
