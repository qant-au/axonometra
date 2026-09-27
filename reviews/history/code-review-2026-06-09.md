# Axonometra Code Review — 2026-06-09

**Reviewer:** Claude Opus
**Date:** 2026-06-09
**Scope:** /Users/adam/Projects/axonometra/ — single-project review
**Prior reviews consulted:** STAGE2-REVIEW.md (Stage 2 audit, F-01 through F-21, dated 2026-06-09). No other `code-review-*.md` present — this is the first comprehensive post-Stage-4 review.

---

## Executive Summary

The project is in genuinely good operational shape for a freshly-renamed CRA→Vite fork that finished Stage 4 the same day. The toolchain is current (Vite 6, Vitest 2, TS 5.9, ESLint 9 flat config, Prettier, `.editorconfig`, GitHub Actions CI), the multi-stage Dockerfile is minimal and runs as the unprivileged `nginx` user, the audit surface is small (6 advisories, all dev-server-only), `npm run build`, `lint`, `format:check`, `tsc --noEmit`, and 23 unit tests all pass cleanly. The Stage 2 backlog has been worked down systematically and the remaining open items (Pixi 6→8, `strictNullChecks`, Mantine/Zustand bumps, mobile gate) are correctly queued for Stage 5. Repo hygiene (`.gitignore`, `.dockerignore`, LICENSE attribution, MIT relicense, `.editorconfig`, `.prettierrc`, lockfile committed) is all in order.

The most serious **functional** gap is that the application as shipped is broken-by-design without an external server. `src/api/api-client.tsx` issues five separate `fetch()` calls to `http://localhost:4133/` (`categories`, `category/:id`, `wall/window`, `wall/door`, and `2d/:imagePath` for furniture textures), and that endpoint is the upstream `arcada-backend` Express server which Axonometra explicitly does not include or document. As a result, the furniture drawer is empty, doors/windows cannot be placed (the click triggers a `getDoor()`/`getWindow()` promise that fails with `ERR_CONNECTION_REFUSED` and is then `.then()`-chained into `AddFurnitureAction` — silently dropped), and any `Furniture` instance created from a loaded plan attempts to load its texture from a dead URL. The Playwright smoke test explicitly allowlists this failure mode. The README, embedding pitch, and project site (`axonometra.com`) say nothing about needing a separate backend. Until that gap is closed — either by inlining a static manifest, ditching the network layer entirely, or shipping a backend — the app is a partial demo, not a usable floor planner.

The most serious **security/operational** items are: (1) untrusted plan-file loading — `FloorPlan.load(planText)` calls `JSON.parse` with no schema validation, no `__proto__` filter, and no error handling, and is wired to a user-supplied file input and to `localStorage.getItem('autosave')` (which is passed directly into `JSON.parse` even when it is `null`, triggering an immediate runtime crash); (2) the nginx config sets `X-Frame-Options: SAMEORIGIN` and has no CSP / `frame-ancestors` directive, which directly contradicts the README's stated embeddability goal; (3) there is no `postMessage`-based embedding surface, no documented plan-file schema or version field, and no API contract document — so the "browser-embeddable plan editor" promise is unimplemented at the code level, not just the docs level; (4) several long-lived module-level singletons (`FloorPlan.Instance`, `TransformLayer.Instance`, `AddWallManager.Instance`, the static `WallNodeSequence.wallNodeId`, the global `let main: Main` exported from `EditorRoot.tsx`, and a `document.onkeydown = …` assignment in `Main.ts`) will leak / corrupt state across any React 18 `StrictMode` double-mount, HMR reload, or user navigation that unmounts and re-mounts `EditorRoot` — the cleanup function calls `app.destroy(true, true)` but does not reset the singletons, the keydown handler, or the static counter, so on re-mount the new `Main` will reuse stale `FloorPlan` children that belong to the destroyed application.

The most serious **code-health** items are: (1) `HelpDialog` will hard-crash if `activeTool` ever takes the values `Tool.FurnitureAdd` (declared in `Tool` enum but never populated in `helpBody`) — the indexed lookup returns `undefined` and `helpBody[activeTool].title` throws; (2) `Furniture.constructor` writes `this.parent = attachedTo` (a Pixi protected field with no setter side-effects) instead of letting `addChild` set it — the actual parent association happens because callers in `Floor.ts` follow up with `attachedTo.addChild(object)`, but the direct assignment is misleading; (3) `WallNodeSequence` subscribes to its own `mousemove` and calls `drawWalls()` (which re-runs `wall.drawLine()` for every wall) on every mouse move at all times — even when the user is just panning in View mode — and `Pointer.update`, `Preview.updatePreview`, and `AddWallManager.updatePreview` are also called on every `pointermove` from `Main.ts`; (4) magic numbers (snap thresholds `0.2 * METER`, `0.3 * METER`, wall colors `0x1a1a1a`, handle sizes, label offsets, the `+5`/`-20`/`+150` constants in `Floor.ts` and `MeasureToolManager.ts`) are scattered across the engine; (5) `PrintAction` creates and discards a brand-new `autoDetectRenderer` per print, never destroys it, and opens a popup window without null-checking the result (popup blocker → `popup.document` throws); (6) `WelcomeModal` defines `useStyles = createStyles(...)` inside the component body — a fresh hook per render, defeating Mantine's caching; (7) two ESLint `any` warnings, two `react-hooks/exhaustive-deps` warnings, one stray `console.log(this.zIndex)` in `Furniture.onMouseDown`.

The bundle is **1.0 MB minified / 289 KB gzipped** in a single chunk, which is over the Vite 500 KB warning threshold. No code-splitting is configured. The seven help-mode `.gif` files in `src/res/` total ~720 KB and are imported eagerly by `HelpDialog.tsx` even though most users will never open the dialog. There is no `lazy()` boundary anywhere in the app.

Documentation has the inverse problem of the code: it is well-written, attribution-correct, and stylistically clean — but it materially misrepresents the current state. The README still says "Build: Create React App _(migrating to Vite in v0.1.0)_" and "`npm install && npm start`" as the quickstart, even though the Vite migration shipped, `npm start` is no longer a script, and v0.1.0 was tagged. There is no `CONTRIBUTING.md`, no `CHANGELOG.md`, no `SECURITY.md`, no `CODE_OF_CONDUCT.md`, no `.github/ISSUE_TEMPLATE/`, no `.env.example`, no embedding documentation, and no plan-file schema documentation. For an open-source project at v0.2.0 that names public embeddability as its differentiator, those gaps matter.

Net: the engineering plumbing is in solid shape and the Stage 2 → Stage 4 grind has clearly paid off. The remaining work is concentrated in three buckets — (a) finishing the embedding story so the README isn't aspirational, (b) hardening untrusted-input paths and singleton lifecycle around the Pixi engine, and (c) closing the README / docs / API-surface gap. Stage 5's queue (Pixi 6→8, `strictNullChecks`, Mantine/Zustand bumps, mobile gate) overlaps with several of these but does not cover them all.

---

## Section 1: Repo Hygiene

| File | Present | Notes |
|---|---|---|
| `README.md` | ✅ | Out of date — still says "CRA, migrating to Vite", `npm start` quickstart. See finding **1.1**. |
| `LICENSE` | ✅ | MIT with upstream Apache-2.0 attribution paragraph. Correct. |
| `TODO.md` | ✅ | Unified `@id(axo-NNN)` format, prefix `axo`. Stages 2–5 grouped. Stage 5 items present. |
| `package.json` | ✅ | Renamed to `axonometra-core@0.1.0`. Note: version is still `0.1.0` despite `v0.2.0` git tag (see finding **9.1**). |
| `package-lock.json` | ✅ | Committed; 308 KB. |
| `tsconfig.json` | ✅ | `strict: true`, `strictNullChecks: false` (deferred to axo-015). |
| `eslint.config.js` | ✅ | Flat config; recommended JS + TS + React + react-hooks + prettier. |
| `.prettierrc` | ✅ | semi, no trailing commas, single quotes, 80 width, 2-space tabs. |
| `.editorconfig` | ✅ | Present, lf, utf-8. |
| `.gitignore` | ✅ | Excludes `node_modules`, `dist`, `build`, coverage, Playwright outputs, `.env.*.local`, `.idea/`, `graphify-out/`. |
| `.dockerignore` | ✅ | Excludes node_modules, dist, e2e, .git, docs, .github, .idea. |
| `vite.config.mts` | ✅ | Minimal — port 4891, no manualChunks, no PWA, no sourcemap. |
| `vitest.config.mts` | ✅ | jsdom, setup file, e2e excluded. |
| `playwright.config.ts` | ✅ | Single chromium project; baseURL 4890 (Docker port). |
| `Dockerfile` | ✅ | Multi-stage, nginx-unprivileged base, healthcheck. |
| `docker/nginx.conf` | ✅ | Gzip + security headers but no CSP — see finding **2.2**. |
| `.github/workflows/ci.yml` | ✅ | lint, format:check, typecheck, vitest, vite build. No Playwright (deferred axo-017). |
| `CONTRIBUTING.md` | ❌ | Missing — see finding **5.4**. |
| `CHANGELOG.md` | ❌ | Missing — see finding **9.2**. |
| `SECURITY.md` | ❌ | Missing — see finding **9.3**. |
| `CODE_OF_CONDUCT.md` | ❌ | Missing — see finding **9.4**. |
| `.github/ISSUE_TEMPLATE/`, `PULL_REQUEST_TEMPLATE.md` | ❌ | Missing — see finding **9.5**. |
| `.env.example` | ❌ | Missing — see finding **4e.2**. |
| `.env` | ⚠️ | Committed and contains the dead variable `API_URL='https://localhost:4133/'` — see finding **4e.1**. |
| `.nvmrc` / `.node-version` | ❌ | Missing — `engines` says `>=20` but no pin file. See finding **6.4**. |
| `restart.sh` | ✅ | Documented, defensive (sets traps, polls health, NO_WATCH mode). |

**Finding 1.1 — README does not reflect the post-Stage-3 reality**
Severity: 🟡 Medium
Location: `README.md:14-16, 38, 42-47`
Description: README still labels status as "Pre-release … undergoing a rename, build-tooling migration (CRA → Vite), and modernization pass … Expect breaking changes until v0.1.0 is tagged." v0.1.0 was tagged in Stage 3 and v0.2.0 was tagged after Stage 4 (closing TODO `axo-013` is the only open Stage 4 item but the tag itself exists in `git tag --list`). The Tech-stack box says "Build: Create React App _(migrating to Vite in v0.1.0)_" and the Quick-start says `npm install && npm start`. CRA is gone; `npm start` is no longer a defined script — the actual commands are `npm install && npm run dev`. The "Project site: https://axonometra.com" line is not cross-checked against an actual deployed site (out of scope here, but flag for the maintainer).
Recommendation: Rewrite README's Status, Tech stack, and Quick start sections. Status should reflect "v0.2.0 — Stage 4 (quality foundation) complete; Stage 5 (Pixi v8, strict null checks, Mantine 7 / Zustand 5, responsive UI) in progress". Tech stack should say "Build: Vite + Vitest" and drop the "migrating" parenthetical. Quick start should be `npm install && npm run dev`. Add a one-line note that `npm run test:e2e` requires the Docker container running via `bash restart.sh`.
Status: New

**Finding 1.2 — `src/App.css` is empty but still imported**
Severity: 🟢 Low
Location: `src/App.tsx:2` imports `./App.css` which is a zero-byte file.
Description: Vite will harmlessly bundle the empty file but the import is dead code.
Recommendation: Delete `src/App.css` and the import. Two-line change.
Status: New

---

## Section 2: Security

Priority key: 🔴 Critical | 🟠 High | 🟡 Medium | 🟢 Low

### 2a. Client-side XSS & Untrusted Content

**Finding 2a.1 — `FloorPlan.load` parses user-supplied JSON with no validation**
Severity: 🟠 High
Location: `src/editor/editor/objects/FloorPlan.ts:81-92`, called from `src/editor/editor/actions/LoadAction.ts:13`, triggered from `src/ui/WelcomeModal.tsx:25-33` (file input), `src/ui/Layout/ToolNavbar.tsx:210-215` (file input), and `src/ui/WelcomeModal.tsx:96` (`localStorage.getItem('autosave')`).
Description: `const plan: FloorPlanSerializable = JSON.parse(planText)` is the entire safety check. There is no schema validation, no `__proto__` / `constructor` / `prototype` filter, no type narrowing, and no try/catch. Concretely:
- A malicious plan file with `{"__proto__":{"polluted":true}, "floors":[]}` will pollute the global `Object.prototype` via `JSON.parse` because the assignment chain in the constructor of `Floor` (`new Map<number, number[]>(floorData.wallNodeLinks)`) and the subsequent reads of `node.x`, `node.y`, `fur.width`, `fur.zIndex` will see polluted defaults.
- A plan file with `wallNodeLinks: "not an array"` will crash in `new Map(...)`.
- A plan file with negative or `NaN` coordinates will produce broken geometry, infinite loops in `redrawWalls`, or NaN propagation throughout the Pixi scene.
- `WelcomeModal.tsx:96` calls `FloorPlan.Instance.load(localStorage.getItem('autosave'))` with no null check; if `'autosave'` has never been written, `JSON.parse(null)` returns `null` and the next line `for (const floorData of plan.floors)` throws `Cannot read properties of null (reading 'floors')`, which crashes the editor. This is reachable from the welcome modal's "Load from local save" button on a fresh install.
Recommendation: (a) Wrap `JSON.parse` in a try/catch and surface a notification on failure. (b) Add a `JSON.parse(planText, (key, value) => key === '__proto__' || key === 'constructor' || key === 'prototype' ? undefined : value)` reviver, or use a schema validator (zod / valibot) against `FloorPlanSerializable`. (c) Guard `WelcomeModal.tsx:96` against `null` from `localStorage`. (d) Add a `version` field to `FloorPlanSerializable` and reject unknown versions explicitly. See related finding **5.5** (plan format documentation) and **11.2** (no schema migration story).
Status: New

**Finding 2a.2 — `endpoint`-string is interpolated into texture URLs unsanitised**
Severity: 🟡 Medium
Location: `src/editor/editor/objects/Furniture.ts:29` — `Texture.from(\`${endpoint}2d/${data.imagePath}\`)`; `src/ui/FurnitureControls/FurnitureAddPanel/FurnitureItem.tsx:22` — `Image src={\`${endpoint}2d/${data.imagePath}\`}`.
Description: `data.imagePath` comes from an external API (`getCategoryInfo`) or a loaded plan file. It is concatenated directly into a Pixi texture URL or an `<img src>`. A malicious imagePath value of `../../../etc/passwd` is harmless for fetch (CORS) but a value of `data:text/html;base64,…` or `javascript:alert(1)` in an `<Image src>` is an actual XSS surface, and a value of `https://evil.example.com/track.png` exfiltrates the user IP. There is no allowlist or origin check.
Recommendation: Validate `data.imagePath` against an allowlist (alphanumerics + `.` + `_` + `-`, no scheme, no `..`). Reject values containing `:` or `//`. Apply on both the texture path and the React Image src.
Status: New

**Finding 2a.3 — Reading raw file content with `e.target.files.item(0).text()` has no size / type check**
Severity: 🟢 Low
Location: `src/ui/WelcomeModal.tsx:26`, `src/ui/Layout/ToolNavbar.tsx:211`
Description: User can drop a 1 GB binary into the load-plan input; `.text()` will decode it as UTF-8 and pass it to `JSON.parse`, blocking the main thread for seconds. There is no MIME-type filter on the `<input type="file">` (no `accept=".json,application/json"`), no client-side size cap, and no progress UI.
Recommendation: Add `accept=".json,application/json,text/plain"` to both inputs, reject files larger than e.g. 5 MB before reading, and show a toast on rejection.
Status: New

### 2b. Embedding & Origin Boundaries

**Finding 2b.1 — README claims embeddability but the code has no embedding surface**
Severity: 🟠 High
Location: README.md:5 ("Built for healthcare facility layouts, small-building design (sheds, bunkers, ADUs), and any place a fast, embeddable plan editor is wanted."); no corresponding implementation in `src/`.
Description: The repo has zero `postMessage` calls, no `window.parent` references, no iframe-aware code, no URL-parameter loader (e.g. `?plan=...`), no `EmbedAPI` module, no documentation of an embedding contract, and the nginx config actively *blocks* cross-origin embedding (`X-Frame-Options: SAMEORIGIN`). The product positioning is materially ahead of the implementation.
Recommendation: Either (a) implement a minimum embedding surface — `postMessage({type:'axo:load', plan: {...}})`, `postMessage({type:'axo:request-save'})` → reply with the serialized plan; URL parameter for read-only plan rendering; and `frame-ancestors`-based CSP so the page can be iframed — and document it in a new `EMBEDDING.md`, or (b) walk back the embeddability claim in README/site until the work is done. The dishonesty cost of (b) is small; the security cost of (a) without doing it right is large (postMessage without origin allowlisting is itself a vulnerability class).
Status: New

**Finding 2b.2 — nginx config has no Content-Security-Policy header**
Severity: 🟡 Medium
Location: `docker/nginx.conf:38-42`
Description: `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options: SAMEORIGIN`, and `Permissions-Policy` are set, but `Content-Security-Policy` is absent. For a single-page app that loads zero external resources at runtime (no analytics, no Sentry, no CDN fonts), a moderately strict CSP is straightforward: `default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self' http://localhost:4133; frame-ancestors 'self';` — the `'unsafe-inline'` is required by Mantine/Emotion's runtime style injection, and `connect-src` needs to be widened or made env-configurable for the upstream arcada-backend.
Recommendation: Add a CSP to the nginx config with the policy above (tuned to actual runtime needs). Test with a Playwright run; Mantine v4 + Emotion v11 will fail without `'unsafe-inline'` for styles.
Status: New

**Finding 2b.3 — `X-Frame-Options: SAMEORIGIN` contradicts embeddability**
Severity: 🟡 Medium
Location: `docker/nginx.conf:41, 51, 59`
Description: `X-Frame-Options: SAMEORIGIN` (correctly repeated under all three locations) blocks any cross-origin iframe embedding. This is the safe default for general apps but directly defeats the README's pitch. If embeddability is real, this header needs to be `ALLOWALL` (deprecated) or — preferably — removed and replaced with a CSP `frame-ancestors` directive containing the actual allowlist of embedder origins.
Recommendation: Pair with finding **2b.2**. When CSP is added, drop `X-Frame-Options` (CSP `frame-ancestors` supersedes it) and set `frame-ancestors` to the allowlist that matches the embedding story.
Status: New

### 2c. Secrets & Credential Exposure

**Finding 2c.1 — Committed `.env` file contains dead variable**
Severity: 🟢 Low
Location: `.env` (33 bytes: `API_URL='https://localhost:4133/'`)
Description: The `.env` file is committed and contains `API_URL`, which is never read — the code looks for `VITE_SERVICE_URI`. So the file is misleading rather than insecure. Two problems: (a) the value `https://localhost:4133/` uses HTTPS for a localhost address that the upstream arcada-backend serves over HTTP, which guarantees the env var would not actually work if it were wired up; (b) committing `.env` instead of `.env.example` is the inverse of the standard convention and will lead future contributors astray.
Recommendation: Delete the committed `.env`. Add `.env` to `.gitignore` (currently only `.env.*.local` variants are ignored). Create `.env.example` documenting `VITE_SERVICE_URI=http://localhost:4133/` with a comment explaining this is the upstream arcada-backend URL and is optional. See related finding **4e.1**.
Status: New

**Finding 2c.2 — Local-only: `.git/config` remote URL contains a GitHub PAT**
Severity: 🟠 High (local environment, not in the repository)
Location: `git remote -v` shows `origin https://github_pat_11AQ6E…@github.com/qant-au/axonometra.git`
Description: A GitHub Personal Access Token is embedded in the developer's local `origin` remote URL. The token is **not** committed (it lives in `.git/config`, which is not part of the repository), and it does not appear anywhere in git history (`git log -S "github_pat_"` returns nothing). However, the URL was exposed to this review (and to any other tool the maintainer attaches to this checkout — agents, CI runners using a local clone, log shippers, etc.). The PAT prefix indicates it is a fine-grained PAT scoped to this repo.
Recommendation: Rotate this PAT on GitHub immediately. Re-add the remote without the token in the URL — use `git remote set-url origin https://github.com/qant-au/axonometra.git` and let `gh auth login` or the keychain credential helper supply the token at push time. This is purely a local-machine fix; nothing in the repository needs to change.
Status: New

### 2d. Dependency Vulnerabilities

**Finding 2d.1 — `npm audit` reports 6 advisories, all dev-only (esbuild chain)**
Severity: 🟢 Low
Location: `package-lock.json` — esbuild ≤ 0.24.2 (via vite ≤ 6.4.1, via vite-node, vitest, @vitest/mocker, @vitest/ui)
Description: GHSA-67mh-4wv8-2f99 (any website can send requests to the dev server and read the response). 4 moderate, 2 critical, but all bound to esbuild's dev-server middleware which the production container never invokes. `npm audit fix --force` would push vitest to 4.x, which is a breaking change.
Recommendation: No urgent action. Track this with the Stage 5 Vite/Vitest bump if/when one is scheduled. Note in `SECURITY.md` (once it exists — finding **9.3**) that the production deploy artifact is unaffected.
Status: Recurring (STAGE2-REVIEW.md F-07 — partially resolved; remaining advisories acknowledged in Stage 3 status note).

**Finding 2d.2 — `pixi.js@6.5.10` is two major versions behind v8**
Severity: 🟡 Medium
Location: `package.json:15` — `"pixi.js": "^6.3.0"` (installed 6.5.10).
Description: Pixi.js v6's last 6.x release line continues to receive minor patches but not aggressive security backports. No specific CVE applies, but the codebase is paying technical debt cost: `Loader.shared` (deprecated in v7, removed in v8), `InteractionEvent` (renamed to `FederatedPointerEvent`), `Application` sync constructor (becomes async init in v8), `autoDetectRenderer` API drift, and `TilingSprite.from`/`Texture.from` signature changes. Already scoped as TODO `axo-008`.
Recommendation: Continue with the Stage 5 plan: 6 → 7 → 8 ladder. See `axo-008`.
Status: Recurring (STAGE2-REVIEW.md F-04). See also: TODO.md — "@id(axo-008) Pixi.js v6 → v8 migration (ladder via v7)".

**Finding 2d.3 — `@mantine/*@4.2.12` is five major versions behind v9.3.1**
Severity: 🟡 Medium
Location: `package.json:9-12`
Description: Mantine 4 is from early 2022; current is 9. The 4 → 7 transition involved a complete API rewrite (`createStyles` removed, theme API restructured, components renamed). Bundle size and accessibility have improved substantially in the 6→9 range. Already scoped as TODO `axo-016`.
Recommendation: Continue with `axo-016`. Plan for a UI dev-server smoke before/after.
Status: Recurring (STAGE2-REVIEW.md F-04 implicitly; explicit in TODO axo-016).

**Finding 2d.4 — `zustand@3.7.2` is two major versions behind v5**
Severity: 🟡 Medium
Location: `package.json:20`
Description: Zustand 3 → 4 changed the import surface (`import create from 'zustand'` → `import { create } from 'zustand'`). 4 → 5 dropped legacy createStore. The stores are small (2 files, ~70 lines total) — migration is mechanical.
Recommendation: Bundle into `axo-016` Mantine bump or split out — either way trivial.
Status: Recurring (TODO axo-016).

**Finding 2d.5 — `react-device-detect` and `pixi.js` both ship an `isMobile` and the codebase uses both**
Severity: 🟢 Low
Location: `src/editor/editor/Main.ts:5` imports `isMobile` from `pixi.js`; `src/editor/editor/objects/Walls/WallNode.ts:9` and `src/editor/editor/objects/TransformControls/Handle.ts:2` import `isMobile` from `react-device-detect`.
Description: Two different mobile-detection libraries are bundled to answer the same question. Pixi's `isMobile` is a thin wrapper over the npm `ismobilejs` package; `react-device-detect` is a separate UA parser. They will sometimes disagree (e.g. iPad on iPadOS 13+ now reports as desktop in `react-device-detect` but mobile in Pixi). Bundle bloat is small (~10 KB), but the inconsistency is a real bug surface.
Recommendation: Pick one. Suggest dropping `react-device-detect` entirely (only used in three call-sites) and using Pixi's `isMobile` throughout. Or use `window.matchMedia('(pointer: coarse)')` which is the modern idiom and library-free.
Status: New

### 2e. File Save / Load Security

Covered in **2a.1** (load validation) and **2a.3** (file size / type). One additional point:

**Finding 2e.1 — `SaveAction` writes plans as `text/plain` with `.txt` extension**
Severity: 🟢 Low
Location: `src/editor/editor/actions/SaveAction.ts:13-14`
Description: `new Blob([data], { type: 'text/plain;charset=utf-8' })` and `saveAs(blob, 'floor_plan.txt')`. The format is actually JSON. Filename `.txt` makes round-tripping awkward (some OSes will refuse to open it with editors that expect JSON, double-click won't pick the right MIME, the load input has no MIME hint). Also, the filename is hardcoded — every save overwrites the prior download.
Recommendation: Use `type: 'application/json'`, filename `axonometra-plan-YYYY-MM-DD-HHmm.json` (build the timestamp client-side). Consider giving users a prompt for filename, or at least making the default reflect the plan's own name (once plans have names).
Status: New

### 2f. Docker / nginx Configuration

The Dockerfile is in good shape: pinned base image (`node:22.22-alpine` for build, `nginxinc/nginx-unprivileged:1.30-alpine` for runtime), multi-stage, npm-ci with raised fetch timeout, healthcheck, non-root user (the unprivileged image), no secrets baked in. `.dockerignore` excludes the right things. The nginx config is restrictive (gzip enabled, server_tokens off, autoindex off, immutable asset caching, no-cache on index.html, SPA fallback correct).

Outstanding nginx items already raised: **2b.2** (no CSP), **2b.3** (`X-Frame-Options` blocks embedding).

**Finding 2f.1 — Dockerfile pins to `node:22.22-alpine` while `package.json` engines says `>=20`**
Severity: 🟢 Low
Location: `Dockerfile:12` vs `package.json:5-7`
Description: Inconsistency — the engine constraint allows Node 20, 21, 22, 23, 24, but the Dockerfile picks 22.22 specifically. The CI workflow (`.github/workflows/ci.yml:21`) uses Node 20. So local dev, CI, and production may all be on different majors. Node 22 is the current LTS; Node 20 is also still in LTS through 2026-04. No immediate problem, but the inconsistency is the kind of thing that bites two years later when one of them drops out of LTS.
Recommendation: Pick a single major (recommend 22, since it's current LTS), update the CI workflow to match, and pin via `.nvmrc` (finding **6.4**).
Status: New

**Finding 2f.2 — No brotli compression in nginx**
Severity: 🟢 Low
Location: `docker/nginx.conf:18-37`
Description: Only gzip is enabled. The base image is `nginx-unprivileged:1.30-alpine` which does not include the brotli module. Brotli compresses ~20% better than gzip on JS bundles — for the 1 MB main chunk that's ~50 KB saved on the wire.
Recommendation: Either accept gzip-only (fine for v0.2.0), or switch to a base image with brotli (`fholzer/nginx-brotli` or build your own). Don't bother until the bundle is split (finding **3c.1**) — code-splitting is a bigger win than brotli.
Status: New

---

## Section 3: Performance

### 3a. Pixi.js Rendering & Memory

**Finding 3a.1 — `WallNodeSequence` redraws every wall on every `mousemove`**
Severity: 🟠 High
Location: `src/editor/editor/objects/Walls/WallNodeSequence.ts:20` — `this.on('mousemove', this.drawWalls);`
Description: `WallNodeSequence` is a long-lived Pixi container; it subscribes to its own `mousemove` event and calls `drawWalls()`, which iterates every wall and re-runs `wall.drawLine()` — a full `clear()` + `lineStyle()` + `drawRect()` + label position update — for every wall on every pointer move, regardless of active tool. With even a modest 30-wall plan this is 30 `Graphics.clear()` calls per pointermove event (potentially 60+ Hz on a modern mouse). The same pointermove event already fires `Main.updatePreview`, which calls `AddWallManager.updatePreview`, `Preview.updatePreview`, and `Pointer.update`. Combined, this is a hard-to-justify amount of redrawing for the View / Edit / Erase modes where no wall geometry is actually changing.
Recommendation: Remove the `this.on('mousemove', this.drawWalls)` subscription — `drawWalls()` is already called explicitly from `addNode`, `addWall`, `removeWall`, `setPosition` (via `WallNode.setPosition → FloorPlan.redrawWalls`), and from `WallNode.onMouseMove` while dragging. The mousemove subscription is redundant in all geometry-mutating paths and wasteful in non-mutating paths.
Status: New

**Finding 3a.2 — Module-level singletons survive React unmount; cleanup is incomplete**
Severity: 🟠 High
Location: `src/editor/EditorRoot.tsx:14, 22-56`; `src/editor/editor/objects/FloorPlan.ts:13, 31-33`; `src/editor/editor/objects/TransformControls/TransformLayer.ts:20, 55-57`; `src/editor/editor/actions/AddWallManager.ts:15, 88-90`; `src/editor/editor/objects/Walls/WallNodeSequence.ts:11`; `src/editor/editor/Main.ts:124-140`
Description: The `EditorRoot` useEffect cleanup calls `app.destroy(true, true)` — which destroys the Pixi `Application`, its renderer, its stage, and all descendants (`true, true` = destroy children + textures + base textures). But the cleanup does **not** reset the module-level singletons that hold references to the destroyed scene: `FloorPlan.instance` still points at a destroyed `FloorPlan` container (and its destroyed `Floor` children); `TransformLayer.instance` likewise; `AddWallManager.instance.previousNode` likely holds a destroyed `WallNode`; the static `WallNodeSequence.wallNodeId` counter persists; the exported `let main: Main` from `EditorRoot.tsx` still references the destroyed `Main`; and `Main.viewportPluginManager` / `Main.app` (static fields) point at destroyed Pixi internals. Most importantly, `document.onkeydown = (e) => { … save() … }` at `Main.ts:130-140` is a global handler that survives unmount and still calls into the destroyed `FloorPlan.Instance.save()` (which is actually the singleton — so the save still works but the data is the old destroyed scene's serialised form, leading to nonsense plans on Ctrl+S after re-mount).

Practical impact: React 18 `StrictMode` mounts effects twice in development — every dev session is affected. HMR reloads have the same problem. Any future flow that conditionally renders `<EditorRoot/>` (e.g. modal-mode, route guard, embedded usage where the host hides/shows the editor) will leak. The bug is currently latent because `<EditorRoot/>` is always mounted in `PageLayout`, but it is fragile.

Recommendation: (a) Convert the module-level `main` export to a context or store value, set in the effect and torn down in cleanup. (b) Replace the singleton getters with explicit `dispose()` methods called from the cleanup. (c) Use `window.addEventListener('keydown', handler)` + `removeEventListener` instead of `document.onkeydown =` (which is a property, not an event listener stack — assigning it overwrites whatever was there, and you cannot detach without setting it back to `null`). (d) Reset `WallNodeSequence.wallNodeId` and clear `Main.viewportPluginManager` / `Main.app` on dispose.
Status: New

**Finding 3a.3 — `PrintAction` leaks an `autoDetectRenderer` and risks null-deref on popup blocker**
Severity: 🟡 Medium
Location: `src/editor/editor/objects/FloorPlan.ts:63-74`, called from `src/editor/editor/actions/PrintAction.ts`
Description: `print()` calls `autoDetectRenderer(opts)` with only `{ preserveDrawingBuffer: true }` set — so dimensions default to 800×600 (the upstream/Pixi default), which crops most floor plans. The renderer is never `.destroy()`-ed — every print call creates a fresh WebGL context. After a small number of prints the browser will throttle WebGL context creation (modern browsers cap at ~8 concurrent contexts) and the print silently stops working. Additionally, `window.open()` returns `null` when the popup is blocked (which most browsers do for unprompted opens), so `popup.document.body.appendChild` throws an immediate `TypeError`.
Recommendation: (a) Set explicit width/height on the renderer based on the floor plan bounds, or render at the viewport size. (b) Call `renderer.destroy(true)` after extracting the image. (c) Null-check the popup result and surface a user notification on block. (d) Consider switching to the `extract.canvas` → `canvas.toBlob` → `URL.createObjectURL` → `<a download>` pipeline so the print path doesn't depend on popups at all.
Status: New

**Finding 3a.4 — `Furniture.constructor` assigns `this.parent` directly instead of using `addChild`**
Severity: 🟡 Medium
Location: `src/editor/editor/objects/Furniture.ts:36-37` — `this.parent = attachedTo;`
Description: Pixi's `DisplayObject.parent` is a property maintained by `Container.addChild` / `removeChild`. Assigning it directly does **not** insert the object into the parent's `children` array, does not trigger reactivity, and confuses Pixi's transform propagation. The code happens to work because callers (`Floor.ts:54`, `Floor.ts:136`) follow up with `attachedTo.addChild(object)` which sets the parent correctly. So the assignment in the constructor is a no-op-with-bad-vibes — but it is technically a Pixi misuse and the kind of thing that will silently change behaviour during the v8 migration.
Recommendation: Delete `this.parent = attachedTo;`. The follow-up `addChild` calls already do the right thing.
Status: New

**Finding 3a.5 — `useDefineForClassFields: true` + Pixi v6 inheritance is historically a footgun**
Severity: 🟡 Medium · Confidence: Low
Location: `tsconfig.json:23`
Description: `useDefineForClassFields: true` makes class fields use `Object.defineProperty` semantics (per ES2022 spec) instead of legacy assignment. Pixi v6's `Container` / `Graphics` classes were authored in pre-ES2022 TypeScript and assume legacy assignment for subclass fields. There are documented cases where subclasses like `class Wall extends Graphics` lose initialisation of inherited fields under the new semantics. The unit + smoke tests currently pass, so the runtime impact (if any) is not surfacing — but the combination warrants a tick-the-box check during the Pixi v8 migration.
Recommendation: When upgrading to Pixi v7/8 (which moves to a modern build), verify that all `Container` / `Graphics` subclasses initialise correctly. If you see undefined inherited fields, flip `useDefineForClassFields: false` (which is the safer default for Pixi v6 codebases).
Status: New · Confidence: Low — no observable failure today, but a known interaction.

**Finding 3a.6 — `Texture.from` for furniture textures has no error handler**
Severity: 🟢 Low
Location: `src/editor/editor/objects/Furniture.ts:29`
Description: `Texture.from(\`${endpoint}2d/${data.imagePath}\`)` — when the upstream arcada-backend is not running (which is most of the time, per Section 7), Pixi will create the texture, fail to load the image, and surface this in the console as a 404. The Furniture sprite renders as a 1×1 white square. There is no fallback texture and no user-visible error.
Recommendation: Add an `onerror`/`onComplete` callback that swaps in a placeholder texture (e.g., a grey rectangle the same size as the furniture's `data.width × data.height`).
Status: New

### 3b. React & State Performance

**Finding 3b.1 — `useStore()` in `EditorRoot` subscribes to the entire store**
Severity: 🟡 Medium
Location: `src/editor/EditorRoot.tsx:20`
Description: `useStore();` (with no selector) subscribes the component to every store change — every tool switch, snap toggle, floor change forces a re-render of `<EditorRoot/>`. The useEffect dependency array is `[]` so the Pixi app is not reinitialised, but React does walk the tree on each re-render. A comment in the file says "Both hooks were called for their side-effect subscriptions in the upstream code; their return values weren't read. Preserve the calls." — that is a misread of the upstream intent. There is no side-effect: Zustand's hook subscribes only the React component, and React doesn't care about the return value. Removing the call is safe.
Recommendation: Delete the `useStore();` call and the `useStyles();` call (the `useStyles` hook in this file isn't even used — `inactive` is never read). Update the misleading comment.
Status: New

**Finding 3b.2 — `WelcomeModal` defines `createStyles` inside the component body**
Severity: 🟡 Medium
Location: `src/ui/WelcomeModal.tsx:19-23`
Description: `const useStyles = createStyles(() => ({ padded: { padding: '4px' } }));` is inside the function body. `createStyles` returns a hook whose cache key is the function identity — re-creating the hook on every render breaks the cache, regenerates the CSS class name, and emits a new Emotion `<style>` tag per render. Mantine 4 will accumulate orphaned style nodes in `<head>`.
Recommendation: Hoist the `createStyles` call to module scope, as it is in every other component (`NavbarLink.tsx`, `ToolNavbar.tsx`, `FurnitureAddPanel.tsx`, `EditorRoot.tsx`).
Status: New

**Finding 3b.3 — `react-hooks/exhaustive-deps` warnings unaddressed**
Severity: 🟡 Medium
Location: `src/App.tsx:12` (`getCategories` missing dep), `src/ui/FurnitureControls/FurnitureAddPanel/FurnitureAddPanel.tsx:32` (`getCurrentFurnitureData` missing dep)
Description: Both warnings flag the same pattern: a Zustand action is destructured at the top of the component and called inside a useEffect with `[]` deps. Because Zustand returns a stable action reference, adding it to the dep array doesn't actually cause loops, but ESLint can't know that. Currently the warnings are suppressed by config severity ('warn') and ignored.
Recommendation: Either (a) call the action via `useStore.getState().setCategories(...)` inside the effect (avoiding the dep), or (b) move the call out of `useEffect` and use Zustand's `subscribe` API. Suppressing with `// eslint-disable-next-line` is also acceptable if commented with why.
Status: New

**Finding 3b.4 — `FurnitureAddPanel` declares unused state and `useEffect` re-run on stale closure**
Severity: 🟢 Low
Location: `src/ui/FurnitureControls/FurnitureAddPanel/FurnitureAddPanel.tsx:22, 25-26, 35-41`
Description: `_availableCategories` / `_setAvailableCategories` are declared and never read (underscore-prefixed to silence noUnusedLocals — see `scripts/strip-unused.py`). `cards` state is an array of JSX elements created from `currentFurnitureData` — this is a React anti-pattern (state should hold data, not rendered JSX). The mapping should happen in render.
Recommendation: Delete the `_availableCategories` pair entirely. Replace `const [cards, setCards] = useState([])` and its useEffect with an inline `{currentFurnitureData.map(item => <FurnitureItem ... />)}` in the JSX.
Status: New

### 3c. Bundle Size & Load Performance

**Finding 3c.1 — Production bundle is one 1.0 MB chunk with no code-splitting**
Severity: 🟡 Medium
Location: `vite.config.mts` (no `build.rollupOptions.output.manualChunks`); `dist/assets/index-BqMdayw2.js` = 1,026.55 kB (gzip 288.63 kB).
Description: Vite explicitly warns about this in the build output. The single chunk pulls in Pixi.js, all of Mantine, all of tabler-icons-react, react/react-dom, zustand, file-saver, and the entire editor engine, regardless of what the user does. Time-to-first-render on a 3G connection is bad. There is no `lazy()` boundary in the app.
Recommendation: (a) Add `build.rollupOptions.output.manualChunks` splitting Pixi, Mantine, and react/react-dom into separate chunks — typical recipe: `{ pixi: ['pixi.js', 'pixi-viewport'], mantine: ['@mantine/core', '@mantine/hooks', '@mantine/notifications', '@mantine/dropzone'], react: ['react', 'react-dom'] }`. (b) Lazy-load the `FurnitureAddPanel` (it only matters when the Add menu opens) via `const FurnitureAddPanel = lazy(() => import('./.../FurnitureAddPanel'))` inside a `<Suspense>` boundary. (c) Lazy-load `HelpDialog` and its seven `.gif` imports — see finding **3c.2**.
Status: New

**Finding 3c.2 — Seven help-mode GIFs (~720 KB total) are eagerly bundled**
Severity: 🟡 Medium
Location: `src/ui/HelpDialog.tsx:19-25` — eager imports of `add-wall.gif`, `delete.gif`, `edit-furniture.gif` (478 KB!), `edit-walls.gif`, `add-window.gif`, `add-door.gif`, `measure-tool.gif`
Description: Vite turns these into 7 hashed asset URLs that ship in `dist/assets/`, but the `import` statements pull them into the main JS chunk's module graph — so the user pays parse-and-resolve cost for them even if they never open the help dialog. The `edit-furniture.gif` alone is 478 KB.
Recommendation: (a) Lazy-load `HelpDialog` (see **3c.1**). (b) Move help GIFs to `/public/help/` and reference them via plain string URLs — they then load only when the `<Image src>` element is mounted (when the dialog opens). (c) Long-term, replace GIFs with much smaller MP4 / WebM video clips — typical 5–10× compression for animated screen captures.
Status: New

**Finding 3c.3 — No source maps configured (intentional or accidental?)**
Severity: 🟢 Low
Location: `vite.config.mts`
Description: `vite.config.mts` does not set `build.sourcemap`. Vite's default is `false`, so no source maps ship — which is the right call for a public deploy. Flagging this so the decision is explicit: if you want to upload sourcemaps to an error-tracking service (when Sentry / Bugsnag is added — finding **11.3**), you'll need `build.sourcemap: 'hidden'` so they're generated but not referenced in the JS.
Recommendation: No action now. Revisit when error tracking is wired up.
Status: New

**Finding 3c.4 — `public/manifest.json` is the unedited CRA stock manifest**
Severity: 🟢 Low
Location: `public/manifest.json`
Description: `"short_name": "React App"`, `"name": "Create React App Sample"`. PWA install on iOS / Android Chrome will show "React App" as the name.
Recommendation: Update to `{ "short_name": "Axonometra", "name": "Axonometra Floor Planner", ... }`. Also update favicon / logo to non-React-default assets (`public/logo*.png` look like the CRA defaults — verify).
Status: New

### 3d. Long-Session Behaviour

**Finding 3d.1 — `FloorPlan.actions` array grows unbounded; no undo/redo cap**
Severity: 🟢 Low
Location: `src/editor/editor/objects/FloorPlan.ts:20` (`public actions: Action[];`), pushed to by every action's `execute()` method.
Description: Every executed action is pushed into `FloorPlan.Instance.actions` and never popped (because undo/redo isn't wired up — see the `//TODO: Add node data pt undo/redo` in `DeleteWallAction.ts:6` and the `// remove links containing node TODO if implementing undo. remember these` comment in `WallNodeSequence.ts:96`). On a long editing session the array grows until tab close. Each entry holds a reference to the receiver (`FloorPlan` instance) and, for some actions, to `Wall` / `WallNode` / `Furniture` Pixi objects — so it also prevents GC of replaced objects.
Recommendation: Either (a) implement the undo/redo and cap the stack at e.g. 100, or (b) until undo is real, don't push to the actions array at all (delete the push calls — they are doing nothing useful).
Status: New

**Finding 3d.2 — Autosave-on-Ctrl+S is the only persistence path; no periodic autosave**
Severity: 🟢 Low
Location: `src/editor/editor/Main.ts:124-140`; `// setInterval(autosave, 60000)` is commented out.
Description: Autosave only fires on Ctrl+S, and the localStorage key is fixed (`'autosave'`) — so multiple browser tabs editing different plans overwrite each other. Risk is loss of work for any user who doesn't habitually press Ctrl+S.
Recommendation: Either uncomment the interval (and tune it) or note in `README.md` that the user must press Ctrl+S to save. Future: key the localStorage entry by plan name once plans have names.
Status: New

---

## Section 4: Code Health & Cleanliness

### 4a. Code Quality

**Finding 4a.1 — `HelpDialog` crashes if `activeTool` is `Tool.FurnitureAdd`**
Severity: 🟠 High
Location: `src/ui/HelpDialog.tsx:35-156` populates `helpBody[Tool.View]`, `Tool.Remove`, `Tool.Edit`, `Tool.WallAdd`, `Tool.FurnitureAddWindow`, `Tool.FurnitureAddDoor`, `Tool.Measure` — but **not** `Tool.FurnitureAdd` (declared at `src/editor/editor/constants.ts:36-44`). The render reads `helpBody[activeTool].title` (line 155).
Description: If any code path sets `activeTool` to `Tool.FurnitureAdd`, `helpBody[Tool.FurnitureAdd]` is `undefined` and `.title` throws. The `FurnitureAdd` value is not currently set anywhere in `src/` (`grep -rn "Tool.FurnitureAdd[^WD]"` returns no hits), but the enum value still exists and is reachable from external state mutation or future code. This is a latent crash that strict-null-checks would have flagged.
Recommendation: Either (a) populate `helpBody[Tool.FurnitureAdd]` with a sensible fallback, (b) delete `Tool.FurnitureAdd` from the enum if it is truly dead, or (c) guard the render: `const body = helpBody[activeTool]; if (!body) return null;`.
Status: New

**Finding 4a.2 — Stray `console.log` in `Furniture.onMouseDown`**
Severity: 🟢 Low
Location: `src/editor/editor/objects/Furniture.ts:141` — `console.log(this.zIndex);`
Description: Leftover debug. Pollutes the console in production builds.
Recommendation: Delete the line.
Status: New

**Finding 4a.3 — Commented-out code blocks should be removed or escalated**
Severity: 🟢 Low
Location: `src/editor/editor/objects/assets.ts:1-4` (entire useful content commented out — file is effectively dead `export {};`); `src/editor/editor/Main.ts:110-112` (commented `if (!isMobile) { this.pause = true; }`); `src/editor/editor/Main.ts:128` (`// setInterval(autosave, 60000)`); `src/ui/Layout/PageLayout.tsx:7-20` (entire mobile-gate block commented); `src/editor/editor/Furniture.ts:14, 49, 159` (`// private dragging:`, `//todo update doar la mousedown=true` — Romanian comments inherited from upstream)
Description: Standard fork-hygiene cleanup. Romanian-language comments are upstream artifacts.
Recommendation: (a) Delete `src/editor/editor/objects/assets.ts` outright if it's truly dead. (b) Decide on mobile gate as part of TODO `axo-014` (Stage 5) and either restore or delete the commented block. (c) For the autosave interval — make a decision (finding **3d.2**) and either uncomment or delete. (d) Translate or delete the Romanian comments — they read as `//todo update only on mousedown=true` and similar.
Status: New

**Finding 4a.4 — Magic numbers scattered across the editor engine**
Severity: 🟡 Medium
Location: `src/editor/editor/actions/AddWallManager.ts:35, 50` (`0.3 * METER` snap threshold); `src/editor/editor/objects/Floor.ts:236, 249` (`0.2 * METER` mis-click guard); `src/editor/editor/objects/Walls/Wall.ts:115` (`0x1a1a1a` wall colour, `129` thickness `-WALL_THICKNESS` magic), `src/editor/editor/objects/Walls/Wall.ts:133` (`25` label y-offset); `src/editor/editor/objects/Walls/WallNode.ts:41` (`0x222222` node fill colour); `src/editor/editor/objects/Floor.ts:140` (`+150` floor-placement offset); `src/editor/editor/objects/TransformControls/Handle.ts:30, 67-69` (`10` size, `1.5`, `2.5`, `0.5` scale factors); `src/editor/editor/objects/TransformControls/Label.ts:7-10` (`'Arial'`, `16`, `0x000000`); `src/editor/editor/actions/MeasureToolManager.ts:34, 45` (`2`, `0x1f1f1f`, `20` magic length offset); `src/editor/editor/Pointer.ts:10` (`1`, `0x0`, `2`); `src/editor/editor/objects/TransformControls/TransformLayer.ts:32, 44` (`2` border offset, `7`); `src/editor/editor/objects/TransformControls/Handle.ts:186` (`0.8` move-amount factor).
Description: Snap thresholds, wall colors, handle sizes, label offsets all duplicated. Changing the wall color requires editing two files; changing the snap threshold three.
Recommendation: Pull a `THEME` / `STYLE` object (or extend `constants.ts`) holding all colors, sizes, and thresholds. The size of the refactor is small (the editor engine is ~1500 lines).
Status: New

**Finding 4a.5 — `Furniture.switchOrientation` / `setOrientation` are near-duplicate state machines**
Severity: 🟡 Medium
Location: `src/editor/editor/objects/Furniture.ts:64-136`
Description: Two methods implement the same 4-state orientation cycle (0 → 1 → 2 → 3 → 0) with subtly different bodies — `switchOrientation` is the runtime step, `setOrientation(n)` is the load-time replay that applies steps cumulatively (`if (number > 0) ... if (number > 1) ...`). Bug surface: any change to `switchOrientation` must be mirrored in `setOrientation` and they will drift.
Recommendation: Refactor to a single `applyStep(currentOrientation, resourcePath, target)` helper that mutates anchor / scale / position for one step, then have `switchOrientation` and `setOrientation` both call it.
Status: New

**Finding 4a.6 — `WallNodeSequence.remove` crashes on unknown id**
Severity: 🟡 Medium
Location: `src/editor/editor/objects/Walls/WallNodeSequence.ts:79`
Description: `if (this.wallNodeLinks.get(id).length > 0)` — `this.wallNodeLinks.get(id)` returns `undefined` if `id` was never added; `.length` then throws. Caller `Floor.removeWallNode` does check `this.wallNodeSequence.contains(nodeId)` first, but that only checks `wallNodes.has(id)`, not `wallNodeLinks.has(id)`. The two maps are kept in sync everywhere except a corrupted load, where they could diverge.
Recommendation: Add a guard: `const links = this.wallNodeLinks.get(id); if (!links) { return; }` and similar for the `else` branch's iteration.
Status: New

**Finding 4a.7 — `Floor.clearScreen` is dead code**
Severity: 🟢 Low
Location: `src/editor/editor/objects/Floor.ts:112-116`
Description: `clearScreen` iterates `this.children` and sets `visible = false`. No caller in the codebase (`grep -rn "clearScreen"` returns one hit). Probably an upstream artifact.
Recommendation: Delete.
Status: New

**Finding 4a.8 — `Label.toggleLabel` is a no-op subscriber to a non-existent event**
Severity: 🟢 Low
Location: `src/editor/editor/objects/TransformControls/Label.ts:27-31` — `this.on('toggleLabel', this.toggleLabel); … private toggleLabel(_ev: unknown) {}`
Description: Subscribes to a Pixi event `toggleLabel` that is never emitted in the codebase; the handler is empty. Upstream remnant.
Recommendation: Delete both the subscription and the empty method.
Status: New

**Finding 4a.9 — `ToolNavbar.handleChange` and `WelcomeModal.loadFromDisk` use `e: any`**
Severity: 🟢 Low
Location: `src/ui/Layout/ToolNavbar.tsx:210`; `src/ui/WelcomeModal.tsx:25`
Description: The two ESLint warnings flagged by `npm run lint`. Both functions are file-input change handlers.
Recommendation: Type as `(e: ChangeEvent<HTMLInputElement>) => void`. Replace `e.target.files.item(0).text()` with `e.target.files?.[0]?.text()` (defensive — the file array is technically nullable). This also helps when `strictNullChecks` is enabled in Stage 5.
Status: New

**Finding 4a.10 — `EditorRoot.app.view.oncontextmenu` is a property assignment, not a listener**
Severity: 🟢 Low
Location: `src/editor/EditorRoot.tsx:33-35`
Description: `app.view.oncontextmenu = (e) => e.preventDefault();` works but is non-removable (same problem as `document.onkeydown` in finding **3a.2**). On `app.destroy(true, true)` Pixi removes the canvas from the DOM so the listener becomes unreachable, so this is more of a code-smell than a leak — but the pattern is inconsistent with the rest of the codebase.
Recommendation: Switch to `app.view.addEventListener('contextmenu', e => e.preventDefault())` for consistency.
Status: New

### 4b. TypeScript Discipline

**Finding 4b.1 — `strictNullChecks: false` is masking real bugs**
Severity: 🟠 High
Location: `tsconfig.json:9`. Stage 5 TODO `axo-015` queued.
Description: This is the largest hole in the type system today. Several of the findings in this review are direct consequences (4a.1 HelpDialog null indexing, 4a.6 WallNodeSequence.remove map.get crash, 2a.1 LoadAction parsing null, **4b.3** below). Enabling will surface ~56 sites per the TODO note.
Recommendation: Complete TODO `axo-015` in Stage 5 as planned. Don't slide it.
Status: Recurring (STAGE2-REVIEW.md F-08; TODO axo-015).

**Finding 4b.2 — `let main: Main;` exported uninitialised**
Severity: 🟡 Medium
Location: `src/editor/EditorRoot.tsx:14`; consumed by `src/helpers/ViewportCoordinates.ts:1` (`main.scale.x`, `main.corner.x`) and `src/editor/editor/objects/Floor.ts:6` (`main.corner.x + 150`).
Description: `main` is `undefined` until the EditorRoot useEffect runs. If any consumer fires before mount (e.g. a unit test loading `ViewportCoordinates` without the mocks the existing tests use), `main.scale.x` throws. The Vitest tests work around this with `vi.mock('../../editor/EditorRoot', () => ({ main: { scale: ... } }))` — see `src/helpers/__tests__/ViewportCoordinates.test.ts:8-10`. That's a fragile workaround; the real fix is to not rely on a module-level mutable export.
Recommendation: Wrap `Main` in a React context (`EditorContext`) or store it in the Zustand store. Either eliminates the test-time mock and the race condition.
Status: New (related to recurring axo-015 / null checks).

**Finding 4b.3 — `noImplicitOverride` is enabled but Pixi class subclasses don't use `override`**
Severity: 🟢 Low · Confidence: Low
Location: `src/editor/editor/objects/Walls/Wall.ts:34` (constructor), `src/editor/editor/objects/Furniture.ts:21` etc.
Description: `noImplicitOverride: true` requires `override` on methods that override a parent class method. Pixi v6's types are loose enough that this isn't triggered today, but the v8 upgrade tightens types and may produce a wave of `override` requirements.
Recommendation: No action now; revisit during Pixi v8 migration (axo-008).
Status: New · Confidence: Low — TS does not currently complain, but the rule's interaction with stricter Pixi typings is worth tracking.

**Finding 4b.4 — `useRef<HTMLInputElement>()` (no initial value) typed as nullable**
Severity: 🟢 Low
Location: `src/ui/Layout/ToolNavbar.tsx:194`, `src/ui/WelcomeModal.tsx:17`
Description: `useRef<HTMLInputElement>()` with no argument creates `RefObject<HTMLInputElement | undefined>`. Callsites then do `fileRef.current.click()` (line 329, line 87) without `!` or null-check. Under `strictNullChecks`, this becomes a hard error.
Recommendation: Use `useRef<HTMLInputElement>(null)` and `fileRef.current?.click()` — or `fileRef.current!.click()` if the ref is guaranteed non-null at the call point.
Status: New (subsumed by axo-015 but worth fixing proactively).

### 4c. State Management Discipline (Zustand)

**Finding 4c.1 — `FloorPlan` is a Pixi object AND a state store AND a singleton**
Severity: 🟡 Medium
Location: `src/editor/editor/objects/FloorPlan.ts`
Description: `FloorPlan` extends Pixi `Container` (it is a scene node), holds the entire model (`floors`, `actions`, `furnitureId`, `windowFurniture`, `currentFloor`), is a singleton (`FloorPlan.Instance`), exposes mutator methods called from React components, and persists itself to localStorage. Three responsibilities in one class. This is the root cause of the singleton-lifecycle issues (finding **3a.2**) and the test mocking complexity (every store test has to stub out singletons).
Recommendation: Long-term refactor — extract the model (floors, furniture map, wall topology) into a Zustand store; have `FloorPlan` be a thin Pixi container that subscribes to the store. This is too large for Stage 5 (it would touch ~half the editor codebase) but is worth scheduling as a Stage 6+ initiative.
Status: New

**Finding 4c.2 — `EditorStore` has two `ToolMode` enums and exports the wrong one**
Severity: 🟢 Low
Location: `src/stores/EditorStore.tsx:6-10` defines `enum ToolMode { FurnitureMode, WallMode, ViewMode }`; `src/editor/editor/constants.ts:29-33` also defines `enum ToolMode { WallMode, FurnitureMode, ViewMode }` (with FurnitureMode and WallMode swapped). The store-exported `ToolMode` is the one used in the tests; the constants-exported one is unused in `src/`.
Description: Duplicate enum with reversed ordinals — a recipe for confusion. The unused one in `constants.ts` could be deleted; if anything ever switches imports between them, behaviour silently breaks.
Recommendation: Delete the `ToolMode` enum from `src/editor/editor/constants.ts:29-33`. Re-export from the store if needed elsewhere.
Status: New

**Finding 4c.3 — Stores subscribe components without selectors**
Severity: 🟢 Low
Location: `src/App.tsx:8` (`const { getCategories } = useFurnitureStore();`), `src/ui/Layout/ToolNavbar.tsx:191-192`, `src/ui/Layout/PageLayout.tsx` (indirect), every other Zustand consumer.
Description: Calling `useStore()` with no selector subscribes the component to the entire store. Zustand re-renders the component whenever any field changes. With small stores (current size: 4 fields in EditorStore, 2 in FurnitureStore) the cost is negligible, but the pattern is the wrong default.
Recommendation: Refactor consumers to use selectors: `const setTool = useStore(s => s.setTool); const snap = useStore(s => s.snap);`. Or wait for the Zustand 5 migration (axo-016) to do it as part of that refactor.
Status: New

### 4d. Testing

The Vitest layer is solid as a starting point: 23 tests across 5 files, all passing in 505 ms. Coverage is concentrated on pure helpers (`EuclideanDistance`, `Slope`, `ViewportCoordinates.snap`) and the Zustand stores, with sensible mocking strategies (`vi.mock` for the `EditorRoot.main` singleton and for `AddWallManager.Instance`). The Playwright `e2e/smoke.spec.ts` does the minimum: page load, title, welcome modal button, canvas present, no unexpected console errors. The arcada-backend connection-refused errors are explicitly allowlisted in the smoke check (line 30) — a pragmatic shortcut that should be revisited if/when the backend question is resolved.

**Finding 4d.1 — No unit tests cover the editor engine (the bulk of the codebase)**
Severity: 🟡 Medium
Location: Coverage gap — `src/editor/editor/**` is ~1500 lines of Pixi-heavy code with zero unit tests.
Description: The Stage 4 testing pass intentionally focused on helpers and stores (the cheap wins) — fair scoping. But the engine is where the bugs are (HelpDialog null index, WallNodeSequence.remove map crash, FloorPlan.load parse failure). Pixi mocking is doable: most actions are pure data transformations on the WallNodeSequence / FloorPlan singletons, which can be exercised under jsdom with a minimal Pixi stub.
Recommendation: Stage 5+ should add unit tests for `WallNodeSequence` (addNode / addWall / remove / removeWall / load), `AddWallManager.checkStep`, `Floor.addNodeToWall` (the misclick guards), and `Serializer.serialize` + `FloorPlan.load` round-trip. Use a tiny Pixi stub (Container/Graphics mock that records calls) — no real WebGL needed.
Status: New (extension of recurring F-09; the unit-test portion was closed in Stage 4 but the editor-engine scope was not covered).

**Finding 4d.2 — Playwright e2e is one smoke test; no critical-flow coverage**
Severity: 🟡 Medium
Location: `e2e/smoke.spec.ts` is the only e2e spec.
Description: The smoke validates the app loads. It does not validate the core user journey: select Wall tool → click twice in canvas → walls appear → click Save → file downloads → reload → load file → walls reappear. Without that, no Stage 5 refactor (Pixi v8, Mantine 7) has a regression net for the actual product.
Recommendation: Add a `place-wall.spec.ts` that drives canvas clicks (Playwright's `page.mouse.click(x, y)` works), validates a download happens (`page.waitForEvent('download')`), and a load round-trip. Same Docker baseline (port 4890).
Status: New.

**Finding 4d.3 — `vitest.config.mts` `globals: true` opts into Jest-style globals**
Severity: 🟢 Low
Location: `vitest.config.mts:8`
Description: `globals: true` makes `describe`, `it`, `expect`, `vi`, `beforeEach` available globally without import. The existing tests in `src/**/__tests__` all explicitly `import { describe, expect, it, vi } from 'vitest';` (good!), so the global enablement is unused. Disabling it (and keeping the explicit imports) makes the test files more portable and avoids polluting TypeScript's global namespace.
Recommendation: Remove `globals: true`. Tests will keep working because they already import explicitly.
Status: New

### 4e. Configuration & Environment Management

**Finding 4e.1 — Committed `.env` file with wrong variable name**
Severity: 🟢 Low
Location: `.env` (committed) vs `src/api/api-client.tsx:1` reads `VITE_SERVICE_URI`
Description: The `.env` contains `API_URL='https://localhost:4133/'` (note: `https` not `http`) — this variable is never read by code. The code falls back to the hardcoded `'http://localhost:4133/'` regardless of `.env` contents. So `.env` is misleading and dead.
Recommendation: See **2c.1**: delete the committed `.env`, gitignore the bare `.env`, add `.env.example` with the correct variable name and a comment explaining it's optional.
Status: New

**Finding 4e.2 — Missing `.env.example`**
Severity: 🟡 Medium
Location: Repo root.
Description: Standard convention for a Vite app — an `.env.example` documents the runtime config surface. The codebase has exactly one env variable (`VITE_SERVICE_URI`), but no documentation that it exists or what it does.
Recommendation: Create `.env.example` with:
```
# Optional: URL of the upstream arcada-backend (Express) server for furniture
# textures, doors, and windows. Defaults to http://localhost:4133/. Leave unset
# unless you have a local arcada-backend running.
VITE_SERVICE_URI=http://localhost:4133/
```
Status: New

### 4f. Linting, Formatting, and Developer Experience

**Finding 4f.1 — ESLint config ignores `*.config.js` / `*.config.ts`**
Severity: 🟢 Low
Location: `eslint.config.js:21-22`
Description: The flat config blocks lint on its own config files. For a small ignore list this is fine, but it also means `vite.config.mts`, `vitest.config.mts`, `playwright.config.ts`, `eslint.config.js` itself, and any future `tailwind.config.ts` get no linting. (Note: `.mts` is not matched by the `*.config.ts` glob, so vite/vitest configs are actually linted today — verify.)
Recommendation: Tighten or remove the ignore; lint config files too. Not urgent.
Status: New

**Finding 4f.2 — No pre-commit hook**
Severity: 🟢 Low
Location: No `.husky/`, no `lint-staged`, no `simple-git-hooks`.
Description: CI catches lint/format/typecheck failures on PR, but contributors get the feedback only after pushing. Pre-commit hooks shorten that loop.
Recommendation: Add `simple-git-hooks` (lighter than husky) with a single `pre-commit: npx lint-staged` running prettier + eslint on staged files. Or accept the CI-only feedback loop.
Status: New

**Finding 4f.3 — `npm run format:check` fails on `code-review-instructions.md`**
Severity: 🟢 Low
Location: Working tree (uncommitted), but the check fails.
Description: `prettier --check` includes `*.md` and warns on `code-review-instructions.md`. The check is non-fatal for now (CI passes because the file isn't checked in yet), but as soon as it lands, CI would break.
Recommendation: Add `code-review-*.md`, `action-items-*.md`, `STAGE*-REVIEW.md` to `.prettierignore` (which does not currently exist). Or run prettier-write on the instructions file before committing.
Status: New

---

## Section 5: Documentation

**Finding 5.1 — README does not reflect current state**
See finding **1.1** (Repo Hygiene). Severity: 🟡 Medium.

**Finding 5.2 — `STAGE2-REVIEW.md` lacks a "superseded by" header**
Severity: 🟢 Low
Location: `STAGE2-REVIEW.md`
Description: STAGE2-REVIEW.md is a Stage 2 audit. Most of its findings are closed; the survivors (F-04, F-08, F-21) are now scoped under `TODO.md` Stage 5 entries. A reader landing on the file has no signal that it's historical.
Recommendation: Add a one-line header at the top: `> **Status:** Historical — most findings resolved in Stages 3–4. See TODO.md axo-008, axo-014, axo-015, axo-016 for surviving items. See code-review-2026-06-09.md for the current review.`
Status: New

**Finding 5.3 — No documentation of the upstream-backend dependency**
Severity: 🟠 High
Location: README.md (nothing), TODO.md (nothing), no separate file.
Description: The app makes five fetch calls to `http://localhost:4133/` for furniture data, door/window data, and texture images. That endpoint is the upstream arcada-backend Express server which is NOT included in this fork. As a result, the furniture drawer is empty, door/window placement is broken, and loaded plans render furniture as 1×1 white sprites. None of this is documented. A new contributor cloning the repo and running `npm run dev` will see a broken app and not know why.
Recommendation: README should say plainly: "Furniture, door, and window placement currently require the upstream `arcada-backend` Express server running at `http://localhost:4133/`. This backend is not part of Axonometra. [TODO axo-NNN]: Replace with a static manifest / inlined assets in Stage 6." Or — better — actually resolve the dependency (see **11.1**).
Status: New

**Finding 5.4 — No `CONTRIBUTING.md`**
Severity: 🟡 Medium
Location: Repo root.
Description: For an open-source project under MIT with a public site, the absence of a contributing guide is a real onboarding cost. Topics to cover: dev setup (node 22, npm install, npm run dev), lint/format expectations, commit conventions (the project follows Conventional Commits — `feat:`, `chore:`, `refactor:`, `test:`, `style:`, etc.), PR process, where to ask questions.
Recommendation: Add a short `CONTRIBUTING.md`. 50 lines is enough. Link from README.
Status: New

**Finding 5.5 — Plan file format is undocumented**
Severity: 🟡 Medium
Location: No file describes `FloorPlanSerializable` / `FloorSerializable` / `INodeSerializable` / `IFurnitureSerializable`.
Description: The save format is the public API surface for round-tripping plans. There is no version field (see **2a.1**), no schema documentation, no example. Third parties who want to programmatically generate or read Axonometra plans have to read the TypeScript interfaces and figure it out.
Recommendation: Create `PLAN-FORMAT.md` documenting the JSON schema, an annotated example, and a note on version-field plans. Or add a `$schema` field pointing at a JSON Schema file in the repo.
Status: New

**Finding 5.6 — No embedding documentation**
Severity: 🟡 Medium
Location: No file.
Description: See **2b.1** — embeddability is the README's pitch but there is no contract, no API doc, no example HTML showing how to embed.
Recommendation: Either implement and document (`EMBEDDING.md`), or remove the claim from README.
Status: New (related to 2b.1).

---

## Section 6: Dependency & Supply Chain Health

The lockfile (`package-lock.json`, 308 KB) is committed and current. `npm ci` works. Runtime dependencies are minimal — 11 entries. devDependencies are reasonable — 22 entries. There are no `link:` or `file:` deps. No forked or vendored packages.

Outdated runtime majors are documented in findings **2d.2** (Pixi 6→8, scoped to axo-008), **2d.3** (Mantine 4→9, scoped to axo-016), **2d.4** (Zustand 3→5, scoped to axo-016). React 18 (current is 19) is the same — typically tracked alongside Mantine since Mantine 7+ requires React 18.2+, Mantine 9 requires React 19.

**Finding 6.1 — `tabler-icons-react@^1.43.0` is the old API; `@tabler/icons-react` is the current package**
Severity: 🟢 Low
Location: `package.json:19`
Description: `tabler-icons-react@1.x` is unmaintained (latest 2022). The maintained package is `@tabler/icons-react` (v3.x). Same author, different npm name, different import shape. Bundle impact: tabler-icons-react v1 bundles every icon as a separate JS module — Vite tree-shakes well so the size is small, but the package isn't getting security or React-18 fixes.
Recommendation: Migrate to `@tabler/icons-react` during the Mantine 4→9 bump (axo-016). The import surface is similar; ~30 minute change.
Status: New

**Finding 6.2 — `file-saver@^2.0.5` is fine but the modern replacement is the native `showSaveFilePicker` API**
Severity: 🟢 Low
Location: `package.json:13`
Description: `file-saver` works. The File System Access API (`window.showSaveFilePicker`) is available in Chromium-based browsers (Chrome, Edge, Opera) but not Safari/Firefox. For Axonometra's user base (desktop browsers) the native API is preferable when available — it gives users a real OS save dialog, supports overwriting, and remembers location.
Recommendation: Optional. Keep `file-saver` for now; add a `showSaveFilePicker` path with feature detection in Stage 6.
Status: New · Confidence: Low — this is an opinion call, not a defect.

**Finding 6.3 — `pixi-viewport@4.x` will need to move in lockstep with Pixi**
Severity: 🟢 Low
Location: `package.json:14`
Description: `pixi-viewport@5` targets Pixi 7; `pixi-viewport@6` targets Pixi 8. Already on the radar via axo-008.
Recommendation: Bundle into axo-008. No standalone action.
Status: Recurring (TODO axo-008).

**Finding 6.4 — No `.nvmrc` / `.node-version`**
Severity: 🟢 Low
Location: Repo root.
Description: `engines` says `>=20`, CI uses 20, Dockerfile uses 22.22, local developers run whatever. A pin file ensures everyone is on the same major.
Recommendation: Add `.nvmrc` containing `22` (matches the Dockerfile and matches current LTS). Update the CI workflow to use `node-version-file: .nvmrc`.
Status: New (related to 2f.1).

---

## Section 7: Build, Container & Deployment Readiness

`npm run build` succeeds in 1.93s, producing a 1.8 MB `dist/` directory dominated by the 1.0 MB main JS chunk and the 478 KB `edit-furniture.gif`. Vite warns about the chunk size; no warnings on tsc. The build has a swarm of `/*#__PURE__*/` annotations from `@radix-ui/react-scroll-area` (a transitive dep of Mantine 4) that Rollup can't interpret — these are noise only, not blockers, and disappear when Mantine is bumped.

`docker build` was not re-run by this review but the Dockerfile is the one Stage 3 produced and was confirmed working then. `.dockerignore` is correct.

CI workflow (`.github/workflows/ci.yml`) runs install → lint → format:check → typecheck → vitest → vite build on push to main and pull_request to main. No Playwright (deferred to axo-017).

**Finding 7.1 — Vite build warnings about Radix `@__PURE__` annotations**
Severity: 🟢 Low
Location: `npm run build` output — ~12 lines of `A comment "/*#__PURE__*/" … contains an annotation that Rollup cannot interpret due to the position of the comment.`
Description: Cosmetic. These come from a transitive dependency Mantine 4 → @mantine/dropzone → @radix-ui. Mantine 7+ has dropped Radix entirely. Resolves automatically with axo-016.
Recommendation: No action. Will close when Mantine bumps.
Status: New

**Finding 7.2 — CI workflow doesn't run Playwright; no end-to-end safety net on PR**
Severity: 🟡 Medium
Location: `.github/workflows/ci.yml`
Description: Already scoped as TODO `axo-017` for Stage 5. Until then, e2e regressions can land on main and only be caught by manual testing.
Recommendation: Complete `axo-017` per its TODO note (containerised via `restart.sh NO_WATCH=1`).
Status: Recurring (TODO axo-017).

**Finding 7.3 — No `npm audit` step in CI**
Severity: 🟢 Low
Location: `.github/workflows/ci.yml`
Description: New advisories will only be caught when a developer runs `npm audit` locally. Given the small surface (6 dev-only advisories today), the value of a CI step is modest, but it's a one-line add.
Recommendation: Add a step: `- name: npm audit (advisory)\n  run: npm audit --audit-level=high\n  continue-on-error: true` (or fail on critical only). Or use GitHub's Dependabot (already free, runs out-of-band).
Status: New

**Finding 7.4 — CI uses Node 20; Dockerfile uses Node 22.22**
Severity: 🟢 Low
Location: `.github/workflows/ci.yml:21` vs `Dockerfile:12`
Description: See finding **2f.1**.
Recommendation: Align to a single major (recommend 22). One-line edit each.
Status: New (subsumed by 2f.1 + 6.4).

**Finding 7.5 — `restart.sh` is well-built but undocumented in README**
Severity: 🟢 Low
Location: `restart.sh` (only mentioned inside `playwright.config.ts` comments).
Description: The script is defensive, well-commented, and handles signals correctly. README should at minimum reference it under a "Local production preview" section so contributors know it exists.
Recommendation: One-paragraph addition to README.
Status: New

---

## Section 8: Accessibility (a11y) & UX

**Finding 8.1 — Canvas-driven editor has no keyboard accessibility**
Severity: 🟡 Medium
Location: `src/editor/EditorRoot.tsx`, all of `src/editor/editor/`
Description: All editing operations (place wall, drag node, select furniture, resize handle) are pointer-driven. The only keyboard binding is Ctrl+S for save (`src/editor/editor/Main.ts:131`). Users with motor impairments and keyboard-only users have no way to use the editor.
Recommendation: This is a substantial design problem, not a quick fix. At minimum: (a) document the limitation in `README.md` (under an "Accessibility" section), (b) make the navbar tool-selection keyboard-accessible (Mantine's `UnstyledButton` is keyboard-focusable but the navbar items don't visibly indicate focus). Longer term: keyboard navigation in the canvas (arrow keys move the selected node, Enter to place, etc.) is a real feature.
Status: New (related to TODO axo-014 — mobile/responsiveness review, conceptually adjacent).

**Finding 8.2 — Icon-only navbar buttons rely on Tooltip for label**
Severity: 🟡 Medium
Location: `src/ui/NavbarLink.tsx:45-62` (wraps `UnstyledButton` in `Tooltip` with `label`), `src/ui/Layout/ToolNavbar.tsx` (consumers)
Description: Mantine's `UnstyledButton` does not auto-`aria-label` from its tooltip. Screen readers will announce "button" with no further context. The `Tooltip` only surfaces on hover/focus visually.
Recommendation: Add `aria-label={label}` to the `UnstyledButton` in `NavbarLink.tsx`. One-line fix.
Status: New

**Finding 8.3 — Welcome modal traps Escape but `closeOnEscape={false}`**
Severity: 🟢 Low
Location: `src/ui/WelcomeModal.tsx:51`
Description: `closeOnEscape={false}` + `closeOnClickOutside={false}` + `withCloseButton={false}` means the modal has exactly three exits: New plan, Load from disk, Load from local save. There is no "skip" option, so any user who lands on the page must commit to one of three actions. This is hostile to first-time users who just want to look around.
Recommendation: Allow Escape and outside-click to dismiss. Or add an explicit "Close" button. The current state is defensible (forces an explicit choice) but inconsistent with usual modal patterns.
Status: New · Confidence: Low — this is a UX opinion.

**Finding 8.4 — No documented mobile / touch support**
Severity: 🟡 Medium
Location: `src/editor/editor/objects/Walls/WallNode.ts:20-24`, `src/editor/editor/objects/TransformControls/Handle.ts:64-66`, commented-out mobile gate in `PageLayout.tsx`
Description: The code has scattered `isMobile`-conditional sizing for nodes and handles (doubling sizes on mobile) but the desktop-only modal gate is currently commented out, meaning the app loads on mobile but with no clear UX strategy. Worth a Stage 5 conscious decision.
Recommendation: See TODO axo-014.
Status: Recurring (STAGE2-REVIEW.md F-21; TODO axo-014).

**Finding 8.5 — Snap toggle button text reads from stale `snap` value**
Severity: 🟢 Low
Location: `src/ui/Layout/ToolNavbar.tsx:284-290`
Description: `onClick={() => { setSnap(!snap); … message: 'Snap to grid now ' + (snap ? 'Off' : 'On') … icon: snap ? <Table/> : <TableOff/> }}`. The `snap` variable in the closure is the value at render time, not the new value being set. After `setSnap(!snap)`, the notification message reads the OLD value (which happens to coincidentally be correct because the ternary inverts — but only by accident). This is fragile.
Recommendation: Compute `const next = !snap;` once at the top of the handler, call `setSnap(next)`, and use `next` consistently.
Status: New

---

## Section 9: Open-Source Project Hygiene

Attribution (LICENSE + README) is correctly preserved — Nicoleta Mehanix is credited in both files; upstream Apache-2.0 origin is acknowledged. The MIT relicense is legally clean (Apache-2.0 §4 permits it with attribution).

**Finding 9.1 — `package.json` version is `0.1.0` but git tags include `v0.2.0`**
Severity: 🟡 Medium
Location: `package.json:3` vs `git tag --list` showing `v0.1.0`, `v0.2.0`
Description: Stage 4 closed with a v0.2.0 tag but `package.json` was never bumped. TODO `axo-013` ("Tag v0.2.0 and push") is still marked `[ ]` (incomplete) in TODO.md. The tag exists; the version field doesn't match.
Recommendation: Bump `package.json` version to `0.2.0` and close `axo-013`. Verify the tag points at the commit after the bump (or amend the tag to a commit that has the version bump — but only if the tag hasn't been used by anyone else yet).
Status: New

**Finding 9.2 — No `CHANGELOG.md`**
Severity: 🟡 Medium
Location: Repo root.
Description: The git log is well-structured (Conventional Commits) but a changelog summarizes what each tag means. Stage 3 → v0.1.0 and Stage 4 → v0.2.0 are both substantive milestones.
Recommendation: Add `CHANGELOG.md` retroactively documenting v0.1.0 (rename + Vite migration + container + smoke) and v0.2.0 (lint/format/CI/strict TS/unit tests). Adopt Keep-a-Changelog format. Going forward, update on each release.
Status: New

**Finding 9.3 — No `SECURITY.md`**
Severity: 🟡 Medium
Location: Repo root.
Description: An open-source project under MIT with a public site needs a security disclosure channel. GitHub auto-discovers `SECURITY.md`.
Recommendation: Add `SECURITY.md` with: supported versions (currently only main), how to report (email, link to GitHub's private vulnerability reporting), expected response time, scope (in-scope: the SPA bundle; out-of-scope: the upstream arcada-backend).
Status: New

**Finding 9.4 — No `CODE_OF_CONDUCT.md`**
Severity: 🟢 Low
Location: Repo root.
Description: Standard OSS hygiene. GitHub provides a Contributor Covenant template generator.
Recommendation: Add Contributor Covenant 2.1 (a standard template). Link from README.
Status: New

**Finding 9.5 — No `.github/ISSUE_TEMPLATE/` or `PULL_REQUEST_TEMPLATE.md`**
Severity: 🟢 Low
Location: `.github/` contains only `workflows/`.
Description: Issue templates structure new bug reports; PR templates structure new PRs. Both help maintainer triage.
Recommendation: Add minimal templates. Bug report (steps to reproduce, expected, actual, browser version). PR template (what / why / tests / checklist).
Status: New

**Finding 9.6 — No public-facing assets verification**
Severity: 🟢 Low · Confidence: Low
Location: README claims `https://axonometra.com` as project site.
Description: Out of scope for code review, but flag for the maintainer: verify the site exists, accurately describes the project state, and does not still mention "arcada".
Recommendation: Manual check.
Status: New · Confidence: Low — not verifiable from the codebase.

---

## Section 10: Upstream Drift & Fork Hygiene

The Stage 3 rename pass was thorough. Across `src/`, `public/`, `docker/`, `scripts/`, `e2e/`, and `index.html`, the only surviving "arcada" reference is a comment in `e2e/smoke.spec.ts:25` explicitly explaining why connection-refused errors are tolerated (the upstream arcada-backend isn't shipped). That comment is correct and should stay.

Upstream artifacts (`docs/Docs - Bachelor's thesis.pdf`, `armchair.fbx/mtl/obj`, `m.azw3`, `sofa.svg`, `background-pattern.svg`, `logo-min.png`) were all deleted in Stage 3. `pattern.svg` (564 bytes) remains and is actively used.

**Finding 10.1 — Romanian-language comments inherited from upstream**
Severity: 🟢 Low
Location: `src/editor/editor/objects/Furniture.ts:12` (`fiecare mobila isi stie index-ul`), `:66` (`0 neutral flip orizontal 2 flip vertical 3 ambele`), `:159` (`todo update doar la mousedown=true`); `src/editor/editor/objects/TransformControls/Handle.ts:107` (`unde se afla target la mousedown`), `:132-148` (extensive Romanian commentary); `src/editor/editor/objects/Floor.ts:222` (`ecuatia dreptei, obtine y echivalent lui x`); `src/editor/editor/objects/Walls/Wall.ts:117` (`aflu unghiul sa pot roti // rads to degs`)
Description: Upstream author wrote the engine with Romanian comments. They are perfectly intelligible after Google Translate but the codebase ends up bilingual. Not a defect but inconsistent.
Recommendation: As part of the next pass over the affected files (e.g. axo-015 strict-null-checks touch most of these), translate the comments to English. Don't do a dedicated translation pass — chunk it with other work in those files.
Status: New (recurring spirit-wise — Stage 2 noted "upstream code" several times but didn't enumerate comment translation).

**Finding 10.2 — No upstream-NOTICE preserved**
Severity: 🟢 Low · Confidence: Low
Location: Apache-2.0 §4(c) requires preserving NOTICE file if one existed in the upstream repository.
Description: Upstream `mehanix/arcada` does not include a NOTICE file (verified by visiting the GitHub repo — no `NOTICE` at root, no `NOTICE.txt`). So there is nothing to preserve. The Apache-2.0 attribution in the LICENSE file's header paragraph satisfies §4(a) (preserving copyright notice) and §4(b) (no patent grant changes). The relicense is legally clean.
Recommendation: No action. Documenting this in `code-review-2026-06-09.md` so the question is settled.
Status: New · Confidence: Low — based on a public-repo check that this review cannot verify offline.

---

## Section 11: Reviewer's Discretion — Additional Findings

### 11a. Functional Completeness

**Finding 11.1 — App is non-functional without the upstream arcada-backend**
Severity: 🟠 High
Location: `src/api/api-client.tsx`, called from `src/stores/FurnitureStore.tsx`, `src/editor/editor/objects/Walls/Wall.ts:189, 202`, `src/editor/editor/objects/Furniture.ts:29`, `src/ui/FurnitureControls/FurnitureAddPanel/FurnitureItem.tsx:22`.
Description: Five fetch-call families depend on a separate Express server at `http://localhost:4133/`: `categories`, `category/{id}` (furniture catalog), `wall/window`, `wall/door` (door + window furniture data), `2d/{imagePath}` (texture images). That backend is the upstream `arcada-backend` Express server which Axonometra does NOT ship. Without it:
- Furniture drawer is empty (`getCategoriesRequest` rejects).
- Door / window placement is broken (`getDoor()` / `getWindow()` promises reject; `.then(...)` callbacks never fire; no error notification).
- Any loaded plan with furniture renders the sprites as 1×1 white squares (`Texture.from` for a 404 URL).

The Playwright smoke test explicitly allowlists `ERR_CONNECTION_REFUSED` (`e2e/smoke.spec.ts:30`) because the smoke can't otherwise pass. This is a fundamental product gap.

Recommendation: Pick one of three paths and document it: (a) **inline a static furniture/door/window manifest** in the repo — practical because the upstream backend served a fixed catalog; (b) **publish a minimal companion backend** as a sister repo (or vendor it into `backend/`) — keeps the API contract identical to upstream; (c) **delete the network layer** entirely and ship a fixed list of door/window types, leaving furniture as a future feature. (a) is the lowest-cost path. Either way the README needs to explain what works and what doesn't until the gap is closed.
Status: New

### 11b. Schema versioning

**Finding 11.2 — Saved plan has no schema version field**
Severity: 🟡 Medium
Location: `src/editor/editor/persistence/FloorPlanSerializable.ts:3-11`
Description: `FloorPlanSerializable` has `floors`, `furnitureId`, `wallNodeId`. No `version`, no `schemaVersion`, no `$schema`. As soon as the format evolves (e.g. add label visibility per-wall, or new furniture attributes), there's no way to detect old vs new plans, and no migration story.
Recommendation: Add `version: 1` to the serializable. `load()` reads the version, defaults to 1 if missing, and routes to per-version migration functions. Cheap to add now; expensive later.
Status: New

### 11c. Error reporting / telemetry / i18n

**Finding 11.3 — No error reporting or telemetry**
Severity: 🟢 Low
Location: Codebase has no Sentry, no Bugsnag, no Rollbar, no plausible / posthog / etc.
Description: Optional. For an open-source pre-release this is fine. If the project moves toward production / commercial deployment, plan an opt-in error reporting integration that scrubs PII (plan contents may include user-named labels in future).
Recommendation: Defer. Note in roadmap.
Status: New · Confidence: Low — purely an opinion call.

**Finding 11.4 — No i18n; all UI strings are hardcoded English**
Severity: 🟢 Low
Location: Throughout `src/ui/`.
Description: The notification copy ("Welcome to Axonometra! 🎉", "Snap to grid now On"), modal copy, help dialog body, tooltip labels are all inline English. No `i18next`, no `@lingui/react`, no `react-intl`.
Recommendation: Defer until there's demand. When demand exists, the migration is straightforward.
Status: New

### 11d. Browser support and Pointer event handling

**Finding 11.5 — `setterAction` and `setter` types in `ToolNavbar.AddMenu` are loose**
Severity: 🟢 Low
Location: `src/ui/Layout/ToolNavbar.tsx:87` (`setter: (tool: number) => void`), `:217-219` (`const setterAction = (val: number) => { setActive(val); };`)
Description: The `setter` prop should be `Dispatch<SetStateAction<number>>` (or just `(val: number) => void`). Loose typing here mostly works but the `setter(-1)` callsite passes a sentinel value `-1` (used to mean "no active mode") which has no documented meaning.
Recommendation: Document the `-1 = no active mode` convention or use a discriminated type (`number | null`).
Status: New

**Finding 11.6 — `Pointer.update` doesn't use the store's snap setting consistently with the rest of the engine**
Severity: 🟢 Low
Location: `src/editor/editor/Pointer.ts:14-23`
Description: `Pointer.update` re-implements snapping inline (`Math.trunc(worldX - (worldX % 10))`) instead of calling `snap()` from `ViewportCoordinates.ts:22-29`. The two implementations agree on positive multiples of 10 but disagree on rounding for `% < 5` vs `% >= 5` (Pointer always rounds down, snap rounds to nearest).
Recommendation: Use the shared `snap` helper. One-line fix.
Status: New

### 11e. Tests / CI environment

**Finding 11.7 — Playwright e2e relies on a Docker container running on host port 4890, but CI doesn't bring it up**
Severity: 🟢 Low
Location: `playwright.config.ts:20` defaults to `http://localhost:4890`; CI workflow doesn't run Playwright at all (scoped to axo-017).
Description: A future contributor running `npm run test:e2e` without first running `bash restart.sh` will see an immediate connection-refused. The Playwright config could `webServer:` start the Vite dev server or the Docker container automatically.
Recommendation: Add a `webServer` block to `playwright.config.ts` that starts `npm run dev` or `bash restart.sh NO_WATCH=1` automatically when no server is detected on the baseURL. This makes the test runnable from a fresh clone with just `npm install && npm run test:e2e`.
Status: New

---

## Appendix: Finding Summary Table

| # | Section | Severity | Title | Status |
|---|---------|----------|-------|--------|
| 1 | Security 2a | 🟠 High | `FloorPlan.load` parses user-supplied JSON with no validation | New |
| 2 | Security 2b | 🟠 High | README claims embeddability but the code has no embedding surface | New |
| 3 | Security 2c | 🟠 High | Local-only: `.git/config` remote URL contains a GitHub PAT | New |
| 4 | Performance 3a | 🟠 High | `WallNodeSequence` redraws every wall on every `mousemove` | New |
| 5 | Performance 3a | 🟠 High | Module-level singletons survive React unmount; cleanup is incomplete | New |
| 6 | Code Health 4a | 🟠 High | `HelpDialog` crashes if `activeTool` is `Tool.FurnitureAdd` | New |
| 7 | Code Health 4b | 🟠 High | `strictNullChecks: false` is masking real bugs | Recurring (STAGE2-REVIEW.md F-08) |
| 8 | Documentation 5 | 🟠 High | No documentation of the upstream-backend dependency | New |
| 9 | Reviewer's Discretion 11a | 🟠 High | App is non-functional without the upstream arcada-backend | New |
| 10 | Repo Hygiene 1 | 🟡 Medium | README does not reflect the post-Stage-3 reality | New |
| 11 | Security 2a | 🟡 Medium | `endpoint`-string is interpolated into texture URLs unsanitised | New |
| 12 | Security 2b | 🟡 Medium | nginx config has no Content-Security-Policy header | New |
| 13 | Security 2b | 🟡 Medium | `X-Frame-Options: SAMEORIGIN` contradicts embeddability | New |
| 14 | Security 2d | 🟡 Medium | `pixi.js@6.5.10` is two major versions behind v8 | Recurring (STAGE2-REVIEW.md F-04) |
| 15 | Security 2d | 🟡 Medium | `@mantine/*@4.2.12` is five major versions behind v9.3.1 | Recurring (TODO axo-016) |
| 16 | Security 2d | 🟡 Medium | `zustand@3.7.2` is two major versions behind v5 | Recurring (TODO axo-016) |
| 17 | Performance 3a | 🟡 Medium | `PrintAction` leaks an `autoDetectRenderer` and risks null-deref on popup blocker | New |
| 18 | Performance 3a | 🟡 Medium | `Furniture.constructor` assigns `this.parent` directly instead of using `addChild` | New |
| 19 | Performance 3a | 🟡 Medium | `useDefineForClassFields: true` + Pixi v6 inheritance is historically a footgun | New (Confidence: Low) |
| 20 | Performance 3b | 🟡 Medium | `useStore()` in `EditorRoot` subscribes to the entire store | New |
| 21 | Performance 3b | 🟡 Medium | `WelcomeModal` defines `createStyles` inside the component body | New |
| 22 | Performance 3b | 🟡 Medium | `react-hooks/exhaustive-deps` warnings unaddressed | New |
| 23 | Performance 3c | 🟡 Medium | Production bundle is one 1.0 MB chunk with no code-splitting | New |
| 24 | Performance 3c | 🟡 Medium | Seven help-mode GIFs (~720 KB total) are eagerly bundled | New |
| 25 | Code Health 4a | 🟡 Medium | Magic numbers scattered across the editor engine | New |
| 26 | Code Health 4a | 🟡 Medium | `Furniture.switchOrientation` / `setOrientation` are near-duplicate state machines | New |
| 27 | Code Health 4a | 🟡 Medium | `WallNodeSequence.remove` crashes on unknown id | New |
| 28 | Code Health 4b | 🟡 Medium | `let main: Main;` exported uninitialised | New |
| 29 | Code Health 4c | 🟡 Medium | `FloorPlan` is a Pixi object AND a state store AND a singleton | New |
| 30 | Code Health 4d | 🟡 Medium | No unit tests cover the editor engine | New |
| 31 | Code Health 4d | 🟡 Medium | Playwright e2e is one smoke test; no critical-flow coverage | New |
| 32 | Code Health 4e | 🟡 Medium | Missing `.env.example` | New |
| 33 | Documentation 5 | 🟡 Medium | `CONTRIBUTING.md` missing | New |
| 34 | Documentation 5 | 🟡 Medium | Plan file format is undocumented | New |
| 35 | Documentation 5 | 🟡 Medium | No embedding documentation | New |
| 36 | Build & Deploy 7 | 🟡 Medium | CI workflow doesn't run Playwright; no end-to-end safety net on PR | Recurring (TODO axo-017) |
| 37 | a11y 8 | 🟡 Medium | Canvas-driven editor has no keyboard accessibility | New |
| 38 | a11y 8 | 🟡 Medium | Icon-only navbar buttons rely on Tooltip for label | New |
| 39 | a11y 8 | 🟡 Medium | No documented mobile / touch support | Recurring (STAGE2-REVIEW.md F-21; TODO axo-014) |
| 40 | OSS Hygiene 9 | 🟡 Medium | `package.json` version is `0.1.0` but git tags include `v0.2.0` | New |
| 41 | OSS Hygiene 9 | 🟡 Medium | No `CHANGELOG.md` | New |
| 42 | OSS Hygiene 9 | 🟡 Medium | No `SECURITY.md` | New |
| 43 | Reviewer's Discretion 11b | 🟡 Medium | Saved plan has no schema version field | New |
| 44 | Repo Hygiene 1 | 🟢 Low | `src/App.css` is empty but still imported | New |
| 45 | Security 2a | 🟢 Low | File-input reading has no size / type check | New |
| 46 | Security 2c | 🟢 Low | Committed `.env` file contains dead variable | New |
| 47 | Security 2d | 🟢 Low | `npm audit` reports 6 advisories, all dev-only (esbuild chain) | Recurring (STAGE2-REVIEW.md F-07) |
| 48 | Security 2d | 🟢 Low | `react-device-detect` and `pixi.js` both ship `isMobile`; codebase uses both | New |
| 49 | Security 2e | 🟢 Low | `SaveAction` writes plans as `text/plain` with `.txt` extension | New |
| 50 | Docker 2f | 🟢 Low | Dockerfile pins to `node:22.22-alpine` while `package.json` engines says `>=20` | New |
| 51 | Docker 2f | 🟢 Low | No brotli compression in nginx | New |
| 52 | Performance 3a | 🟢 Low | `Texture.from` for furniture textures has no error handler | New |
| 53 | Performance 3b | 🟢 Low | `FurnitureAddPanel` declares unused state and `useEffect` re-run on stale closure | New |
| 54 | Performance 3c | 🟢 Low | No source maps configured (intentional or accidental?) | New |
| 55 | Performance 3c | 🟢 Low | `public/manifest.json` is the unedited CRA stock manifest | New |
| 56 | Performance 3d | 🟢 Low | `FloorPlan.actions` array grows unbounded; no undo/redo cap | New |
| 57 | Performance 3d | 🟢 Low | Autosave-on-Ctrl+S is the only persistence path; no periodic autosave | New |
| 58 | Code Health 4a | 🟢 Low | Stray `console.log` in `Furniture.onMouseDown` | New |
| 59 | Code Health 4a | 🟢 Low | Commented-out code blocks should be removed or escalated | New |
| 60 | Code Health 4a | 🟢 Low | `Floor.clearScreen` is dead code | New |
| 61 | Code Health 4a | 🟢 Low | `Label.toggleLabel` is a no-op subscriber to a non-existent event | New |
| 62 | Code Health 4a | 🟢 Low | `ToolNavbar.handleChange` and `WelcomeModal.loadFromDisk` use `e: any` | New |
| 63 | Code Health 4a | 🟢 Low | `EditorRoot.app.view.oncontextmenu` is a property assignment, not a listener | New |
| 64 | Code Health 4b | 🟢 Low | `noImplicitOverride` is enabled but Pixi class subclasses don't use `override` | New (Confidence: Low) |
| 65 | Code Health 4b | 🟢 Low | `useRef<HTMLInputElement>()` (no initial value) typed as nullable | New |
| 66 | Code Health 4c | 🟢 Low | `EditorStore` has two `ToolMode` enums and exports the wrong one | New |
| 67 | Code Health 4c | 🟢 Low | Stores subscribe components without selectors | New |
| 68 | Code Health 4d | 🟢 Low | `vitest.config.mts` `globals: true` opts into unused Jest-style globals | New |
| 69 | Code Health 4f | 🟢 Low | ESLint config ignores `*.config.js` / `*.config.ts` | New |
| 70 | Code Health 4f | 🟢 Low | No pre-commit hook | New |
| 71 | Code Health 4f | 🟢 Low | `npm run format:check` fails on `code-review-instructions.md` | New |
| 72 | Documentation 5 | 🟢 Low | `STAGE2-REVIEW.md` lacks a "superseded by" header | New |
| 73 | Dependencies 6 | 🟢 Low | `tabler-icons-react@^1.43.0` is the old API; `@tabler/icons-react` is the current package | New |
| 74 | Dependencies 6 | 🟢 Low | `file-saver@^2.0.5` is fine but the modern replacement is `showSaveFilePicker` API | New (Confidence: Low) |
| 75 | Dependencies 6 | 🟢 Low | `pixi-viewport@4.x` will need to move in lockstep with Pixi | Recurring (TODO axo-008) |
| 76 | Dependencies 6 | 🟢 Low | No `.nvmrc` / `.node-version` | New |
| 77 | Build & Deploy 7 | 🟢 Low | Vite build warnings about Radix `@__PURE__` annotations | New |
| 78 | Build & Deploy 7 | 🟢 Low | No `npm audit` step in CI | New |
| 79 | Build & Deploy 7 | 🟢 Low | CI uses Node 20; Dockerfile uses Node 22.22 | New |
| 80 | Build & Deploy 7 | 🟢 Low | `restart.sh` is well-built but undocumented in README | New |
| 81 | a11y 8 | 🟢 Low | Welcome modal traps Escape but `closeOnEscape={false}` | New (Confidence: Low) |
| 82 | a11y 8 | 🟢 Low | Snap toggle button text reads from stale `snap` value | New |
| 83 | OSS Hygiene 9 | 🟢 Low | No `CODE_OF_CONDUCT.md` | New |
| 84 | OSS Hygiene 9 | 🟢 Low | No `.github/ISSUE_TEMPLATE/` or `PULL_REQUEST_TEMPLATE.md` | New |
| 85 | OSS Hygiene 9 | 🟢 Low | No public-facing assets verification | New (Confidence: Low) |
| 86 | Fork Hygiene 10 | 🟢 Low | Romanian-language comments inherited from upstream | New |
| 87 | Fork Hygiene 10 | 🟢 Low | No upstream-NOTICE preserved | New (Confidence: Low) |
| 88 | Reviewer's Discretion 11c | 🟢 Low | No error reporting or telemetry | New (Confidence: Low) |
| 89 | Reviewer's Discretion 11c | 🟢 Low | No i18n; all UI strings are hardcoded English | New |
| 90 | Reviewer's Discretion 11d | 🟢 Low | `setterAction` and `setter` types in `ToolNavbar.AddMenu` are loose | New |
| 91 | Reviewer's Discretion 11d | 🟢 Low | `Pointer.update` doesn't use the store's snap setting consistently with the rest of the engine | New |
| 92 | Reviewer's Discretion 11e | 🟢 Low | Playwright e2e relies on a Docker container running on host port 4890, but CI doesn't bring it up | New |

**Total findings:** 92 (Critical: 0, High: 9, Medium: 34, Low: 49)
