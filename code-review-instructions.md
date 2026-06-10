# Axonometra Comprehensive Code Review

You are performing a deep, comprehensive code review of the Axonometra project at /Users/adam/Projects/axonometra/. Axonometra is an open-source, browser-embeddable 2D floor planner built as a single-page React + TypeScript application on Pixi.js, with Zustand for state and Mantine for UI. It is a fork of [mehanix/arcada](https://github.com/mehanix/arcada) (originally Apache-2.0), now relicensed MIT and maintained under the QANT umbrella. There is no backend, no auth layer, no database, and no server-side code in this repository — the entire app runs in the browser. Build is Vite; tests are Vitest (unit) and Playwright (e2e); deploy artefact is a multi-stage Docker image serving the static build via nginx.

You are running as Claude Opus. Token budget is not a concern. Accuracy and completeness are the only constraints. Do not summarise or truncate. Report everything you find.

---

## Output Instructions

Save your complete review output as **two separate files** in the project root:

1. `/Users/adam/Projects/axonometra/code-review-YYYY-MM-DD.md` — the full review (see Output Format below)
2. `/Users/adam/Projects/axonometra/action-items-YYYY-MM-DD.md` — the distilled action items list (see Action Items Format below)

replacing YYYY-MM-DD with today's date (use the `date +%Y-%m-%d` command to confirm).

Save the review file first, then derive the action items file from it. Both files must be written in full in a single operation — do not write incrementally.

**Do not stage, add, or commit either file to git.** Both filenames (`code-review-*.md`, `action-items-*.md`) and this `code-review-instructions.md` file itself are intended as local-only working documents — the maintainer will commit them manually if and when they choose. Do not run `git add` on them.

BEFORE beginning the review, check whether any files matching the pattern `code-review-*.md` exist in the project root:

ls /Users/adam/Projects/axonometra/code-review-*.md 2>/dev/null

Also check for the most recent staged audit document — `STAGE2-REVIEW.md` — and any later stage review files (`STAGE3-REVIEW.md`, etc.) if present. Read each one. When a current finding was already identified in a prior review or stage document, mark it as:

Status: Recurring (previously identified — code-review-YYYY-MM-DD.md) — or — Status: Recurring (previously identified — STAGE2-REVIEW.md F-NN)

New findings not previously identified should be marked:

Status: New

This allows trends to be tracked across reviews over time, and prevents re-litigating issues that are already on the team's radar.

---

## Project Layout

Axonometra is a single repository. The relevant top-level structure is:

- `src/` — application source
  - `src/index.tsx`, `src/App.tsx` — bootstrap and root component
  - `src/editor/` — Pixi.js-based floor-plan engine (EditorRoot, tools, geometry, wall/door/window/fixture/furniture logic). This is the hottest performance path and the largest body of code inherited from upstream Arcada.
  - `src/stores/` — Zustand stores (EditorStore, FurnitureStore)
  - `src/ui/` — React UI shell: Mantine-based layout, navbar, dialogs, furniture controls
  - `src/api/` — client-side API helpers (despite the name, this is browser code; check what it actually does)
  - `src/helpers/`, `src/res/`, `src/test/` — utilities, static resources, test setup
- `e2e/` — Playwright end-to-end tests
- `public/` — static assets served as-is
- `scripts/` — repo-local helper scripts
- `docker/`, `Dockerfile`, `restart.sh` — container build + nginx serving
- `vite.config.mts`, `vitest.config.mts`, `playwright.config.ts`, `eslint.config.js`, `tsconfig.json` — tooling configuration
- `graphify-out/` — graphify knowledge graph index (regenerated; not committed)
- `TODO.md` — outstanding tasks tracked via the unified `@id(...)` TODO format (prefix `axo`)
- `STAGE2-REVIEW.md` — prior audit document (Stage 2 findings F-01 through F-21)
- `README.md`, `LICENSE` — project docs and attribution (MIT, with upstream Apache-2.0 attribution)

Treat the `editor/` Pixi engine as Tier 1 for scrutiny: it is the bulk of the code, the most performance-sensitive, and the most likely source of subtle bugs or memory issues. UI shell and store code is Tier 2. Tooling, scripts, and Docker config are Tier 3.

---

## Review Methodology

Use all tools at your disposal:
- File reads — read key files in full, do not skim. The editor engine is large; read entry points and tool logic in full.
- grep / ripgrep for pattern searches across the codebase
- Directory listings to understand structure
- Shell commands for dependency checks, git history scans, build verification, lint runs
- graphify queries for semantic architectural questions: `cd /Users/adam/Projects/axonometra && graphify query "your question here"` — index is at `graphify-out/graph.json`. If the index is stale, suggest running `graphify --update` but proceed using file reads in the meantime.
- `npm run lint`, `npm run build`, `npm test` — run these and report on output. Do not modify code to fix issues — surface them in the review.

Work through the project methodically:
1. Confirm repo hygiene (Section 1)
2. Read entry points (`src/index.tsx`, `src/App.tsx`, `src/editor/EditorRoot.tsx`) in full
3. Read at least one full tool implementation in `src/editor/editor/` (wall, door, furniture)
4. Read both Zustand stores in full
5. Read the dependency manifest (`package.json`) and lockfile presence
6. Read `vite.config.mts`, `tsconfig.json`, `eslint.config.js`, `Dockerfile`, `playwright.config.ts`
7. Cross-reference findings against `TODO.md` and `STAGE2-REVIEW.md` (Section 11)
8. Use graphify where the index helps for broader architectural questions

Allocate depth proportional to the project areas above — editor engine gets the deepest scrutiny.

---

## Section 1: Repo Hygiene

Confirm presence and quality of the minimum required files:

- `README.md` — purpose, setup, run, build, deploy, license attribution
- `LICENSE` — MIT plus upstream Apache-2.0 attribution
- `TODO.md` — using the unified `@id(...)` format with prefix `axo`
- `package.json` with a lockfile (`package-lock.json`)
- `tsconfig.json` with appropriate strictness
- `eslint.config.js` and a Prettier config
- `.gitignore` excluding `node_modules`, `dist/`, `build/`, `graphify-out/`, Playwright outputs, `.env*` local variants
- `.editorconfig` (mentioned in Stage 4 — confirm presence)
- `vite.config.mts`, `vitest.config.mts`, `playwright.config.ts`
- `Dockerfile` and any `docker/` support files
- CI configuration (GitHub Actions or equivalent) — flag if absent

For anything missing, flag as a finding with severity High if it blocks reproducibility or deploy, Medium for quality gates (lint/CI), Low for nice-to-haves.

---

## Section 2: Security

Severity scale:
- 🔴 Critical — exploitable vulnerability with significant impact; fix immediately
- 🟠 High — serious risk; fix before next release
- 🟡 Medium — real issue but not immediately exploitable; fix in current sprint
- 🟢 Low — improvement; fix when convenient

Axonometra has no server, no auth, and no database. The security surface is therefore narrower than a typical web app — but the surface that does exist matters, especially given the project is designed to be embeddable into other sites.

### 2a. Client-side XSS & Untrusted Content

- Is any user-supplied content (plan names, room labels, notes, imported plan files) ever rendered via `dangerouslySetInnerHTML`, `innerHTML`, or unescaped HTML?
- Are imported floor-plan files (JSON or otherwise) parsed safely? Could a malicious plan file cause prototype pollution, ReDoS, or trigger unsafe DOM operations on load?
- Are file uploads (plans, furniture, images) validated for type, size, and structure — not just by filename or `Content-Type`?
- Is SVG or HTML content ever loaded from user-supplied URLs or files without sanitisation?
- Does the app handle drag-and-drop or paste events safely?

### 2b. Embedding & Origin Boundaries

Axonometra is designed to be embeddable. This creates an extra surface area:

- If the app is embedded in an iframe on a third-party site, does it use `postMessage` for cross-frame communication? If so:
  - Is the message `origin` validated against an allowlist?
  - Is the message `source` validated?
  - Are message payloads schema-validated before use?
- Is `Content-Security-Policy` defined either in the nginx config (Docker deploy) or via `<meta>`? If so, is `frame-ancestors` correctly scoped?
- Are `X-Frame-Options` / `frame-ancestors` set in a way that matches the embedding intent (i.e. not "DENY" if embedding is desired, but not "*" either)?
- Is `Referrer-Policy` set conservatively?

### 2c. Secrets & Credential Exposure

- Are any secrets, API keys, tokens, or credentials hardcoded anywhere in `src/`, `public/`, `scripts/`, or config files? Search: `grep -rE "(sk-|AIza|Bearer |password|secret|api[_-]?key|token)" src/ public/ scripts/ docker/`
- Even though there is no backend, are there any third-party API keys embedded for client-side calls (analytics, error tracking, maps, etc.) that should be configured per-deploy rather than hardcoded?
- Are `.env*.local` files excluded from version control? Confirm `.gitignore`.
- Is `.env.example` present documenting any expected environment variables?
- Scan git history for accidentally committed secrets: `git log --all --full-history --oneline -- "*.env" "**/.env" "*.pem" "*.key"`

### 2d. Dependency Vulnerabilities

- Run or simulate `npm audit --audit-level=moderate` and report findings. Note that some advisories are dev-only (Vite, ESLint, etc.) — distinguish runtime vs dev impact.
- Are runtime dependencies pinned via `package-lock.json`? Confirm the lockfile exists and is committed.
- Note specific known concerns to investigate:
  - `pixi.js` is at v6.x; upstream is v8.x. Are there known CVEs or security advisories for the v6 line that need addressing, independent of whether a major-version upgrade is planned?
  - `@mantine/*` is at v4.x — well behind current Mantine releases. Investigate whether there are advisories.
  - `react-device-detect`, `tabler-icons-react`, `file-saver` — small dependencies; check that they are still maintained and CVE-free.
- Are any packages forked or vendored locally? If so, are they tracked against upstream security patches?
- Are devDependencies leaking into the production bundle? Check `vite.config.mts` and any imports from devDeps in `src/`.

### 2e. File Save / Load Security

The app supports saving plans (likely via `file-saver`) and presumably loading them back.

- When loading a plan file, is the JSON parsed with `JSON.parse` (safe) or `eval` / `Function` (unsafe)? Trace the load path.
- Could a malicious plan file cause prototype pollution by including `__proto__`, `constructor`, or `prototype` keys?
- Is the loaded schema validated before being placed into the Zustand store? Untrusted data hitting the store can flow into rendering and break invariants.
- Is the saved plan format documented? An undocumented format makes safe handling harder.

### 2f. Docker / nginx Configuration

- Does the Dockerfile use a pinned base image (specific tag or digest), not `:latest`?
- Does it use a minimal base (e.g. `nginx:alpine` or `nginx:stable-alpine`) for the runtime stage?
- Does it run as a non-root user in the runtime stage?
- Is the nginx config restrictive? Are security headers added (`X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Content-Security-Policy`, `X-Frame-Options` or `frame-ancestors`)?
- Is gzip/brotli enabled?
- Is there an `.dockerignore` excluding `node_modules`, `.git`, test outputs, and other build noise?
- Are there any secrets baked into the image at build time?

---

## Section 3: Performance

### 3a. Pixi.js Rendering & Memory (Highest Priority)

The editor canvas is the performance hot path. Inefficient patterns here directly affect user experience and can cause memory leaks on long sessions.

- Are Pixi `Graphics`, `Sprite`, `Text`, and `Container` objects properly `.destroy()`-ed when removed from the scene, including children and textures?
- Are `PIXI.Texture` and `PIXI.BaseTexture` instances cached and reused, or are new textures being created on every render / tool action?
- Are there `Graphics` objects being recreated each frame instead of mutated (`clear()` + redraw)?
- Are event listeners on Pixi objects removed when objects are destroyed? Lingering listeners hold references and prevent GC.
- Is the ticker driving redraws only when state actually changes, or is it redrawing every frame regardless?
- Are there `requestAnimationFrame` or `setInterval` loops that aren't cleaned up on unmount?
- Are large operations (e.g. snapping, geometry recalculation across many walls) running on every pointermove, or are they debounced/throttled?
- Are coordinate transforms cached, or recomputed unnecessarily inside tight loops?
- Is the viewport (`pixi-viewport`) configured with sensible bounds and culling? Are off-screen items being skipped?
- Are SVG or texture assets larger than they need to be? Check `public/` and `src/res/` for oversize images.

### 3b. React & State Performance

- Are there Zustand selectors returning unstable references (new object/array literals) that cause unnecessary re-renders?
- Are React components subscribing to entire stores when they only need a slice?
- Are expensive computations (geometry, layout) re-running on every render instead of being memoised?
- Are `useEffect` dependency arrays correct? Look for missing deps, or deps that change on every render (functions, objects).
- Is React reconciliation interacting badly with Pixi (e.g. React re-mounting Pixi containers on every parent render)?
- Are there event handlers being recreated on every render and passed as props to memoised children, defeating the memoisation?

### 3c. Bundle Size & Load Performance

- Run `npm run build` and inspect the output in `dist/`. Report total bundle size, largest chunks, and any obvious bloat.
- Is code splitting in place for routes / heavy modules? Pixi.js + Mantine + the editor engine together can easily exceed 1 MB gzipped — flag if so.
- Are barrel imports pulling in entire libraries when only specific symbols are needed? (e.g. `import { ... } from '@mantine/core'` — should tree-shake, but verify in build output)
- Are images optimised? Check `public/` for un-optimised PNG/JPEG that should be WebP or SVG.
- Is `vite.config.mts` using appropriate `build.rollupOptions` for chunking?
- Are fonts loaded efficiently (preconnect, `font-display: swap`)?
- Is the initial HTML in `index.html` minimal? Are render-blocking resources avoided?
- Are source maps shipped in production? They should not be served publicly without explicit decision.

### 3d. Long-Session Behaviour

- Does the app leak memory over an extended editing session? Look for store mutations that accumulate without bound (history stacks without a cap, etc.).
- Is undo/redo history bounded?
- Are autosave or persistence routines running at sensible intervals?

---

## Section 4: Code Health & Cleanliness

### 4a. Code Quality

- **Upstream dead code:** Axonometra is a fork. Are there modules, components, assets, or features from upstream Arcada that are unused or unreachable in the current build? Flag candidates for removal — but distinguish between "currently dormant but on the roadmap" and "genuinely dead." Cross-reference `TODO.md` and `STAGE2-REVIEW.md` before recommending deletion.
- **Duplication / DRY:** are utilities or geometry helpers duplicated across `editor/`, `helpers/`, and stores?
- **Overly complex functions:** flag functions in the editor engine that are hard to reason about (high cyclomatic complexity, deep nesting, long parameter lists). The editor inherited a lot of upstream code; some of it may need surgical extraction.
- **Inconsistent error handling:** does the editor swallow errors silently, throw, or return error objects? Inconsistency causes subtle bugs.
- **Magic numbers / strings:** the editor has many constants for snapping thresholds, wall thicknesses, scale factors, colour values. Are these named constants in one place, or scattered?
- **Commented-out code:** flag blocks of code left commented out that should be removed.
- **Console.log / debug output:** are there leftover `console.log`, `debugger`, or `// TODO` markers that should be cleaned up or escalated to `TODO.md`?

### 4b. TypeScript Discipline

- **Strict mode:** Stage 4 enabled `strict: true` plus `noImplicitAny/Returns/Override` and `noUnusedLocals/Parameters`. `strictNullChecks` is deferred (axo-015, Stage 5). Confirm `tsconfig.json` reflects this and that no new code is regressing on these flags.
- **`any` types:** count and locate `any` usages. Each `any` is a hole in the type system. Suggest concrete types or `unknown` + narrowing.
- **`@ts-ignore` / `@ts-expect-error`:** locate each, confirm there's a comment explaining why, and flag any that look like they should be fixed properly.
- **Type assertions (`as Foo`):** flag aggressive assertions that bypass real type checking, especially around Pixi objects or event payloads.
- **Public component prop types:** are they explicit and meaningful, or are props typed as `any` / `Record<string, unknown>`?

### 4c. State Management Discipline (Zustand)

- Are stores single-purpose and cohesive, or have they grown into "god stores" holding unrelated state?
- Is store-action API consistent (action methods vs. inline `set` calls from components)?
- Are selectors colocated with the store or scattered through components?
- Is derived state computed in selectors or duplicated as stored fields that can drift?
- Are subscriptions outside React (e.g. inside the Pixi editor) cleaned up on disposal?
- Is the persistence layer (if any — autosave / localStorage) idempotent and safe on schema change?

### 4d. Testing

- Read `vitest.config.mts` and `playwright.config.ts` in full.
- What's the unit test coverage? Examine `src/stores/__tests__/` and `src/test/` — what's actually covered?
- What's covered by Playwright e2e? Currently `e2e/smoke.spec.ts` exists per Stage 3 — is it the only e2e? Are there more critical user journeys (place wall → place door → save → reload) that should be covered?
- Are tests meaningful or trivial smoke tests?
- Are any tests skipped / `xit` / `test.skip` / `test.fixme` without explanation?
- Do tests run reliably (no flake), or are there timing-dependent / canvas-dependent assertions that could be brittle?
- Are tests using a Pixi mock, a real canvas via jsdom, or a real browser via Playwright? Is the choice appropriate per test layer?

### 4e. Configuration & Environment Management

- Are there hardcoded environment-specific values (URLs, ports, feature flags) that should be configurable?
- Is configuration documented in `README.md` and/or `.env.example`?
- Are required environment variables (if any) validated at startup, or do missing values surface as obscure runtime errors?
- Does `vite.config.mts` handle dev vs production cleanly? Are dev-only proxies, plugins, or sourcemaps correctly gated?

### 4f. Linting, Formatting, and Developer Experience

- Run `npm run lint` and report. Are there warnings/errors being suppressed?
- Run `npm run format:check` and report.
- Is there a pre-commit hook enforcing lint/format/tsc?
- Is `eslint-plugin-react-hooks` enabled and clean?
- Are rules sane (not so strict that contributors disable them, not so loose they catch nothing)?

---

## Section 5: Documentation

- **`README.md`** — does it accurately describe the current state (post-Vite migration, post-rename)? Are setup commands correct (`npm install`, `npm run dev`)? Are deploy instructions present (Docker)?
- **`LICENSE`** — is the MIT relicense correctly attributed to the upstream Apache-2.0 source? Are upstream copyright lines preserved?
- **`STAGE2-REVIEW.md`** — is it still relevant, or has it been superseded? If superseded, is that noted?
- **`TODO.md`** — does it use the unified `@id(...)` format with prefix `axo`? Are completed items still listed (with done dates) or being removed (preference is to keep with done date)? Are stage groupings consistent?
- **Code documentation:** are complex sections of the editor engine explained? Are upstream-inherited workarounds commented? Are non-obvious geometry invariants documented?
- **Embedding documentation:** if Axonometra is intended to be embedded, is there documentation on how to embed it, what postMessage events it emits/accepts, and what the plan-file format looks like?
- **Public API surface:** even though there's no backend API, the app exposes embedding hooks and a plan file format. Are these documented?
- **Contributing guide:** is there a `CONTRIBUTING.md`? Given this is open-source, this matters.

---

## Section 6: Dependency & Supply Chain Health

- Confirm `package-lock.json` is committed and current.
- List runtime dependencies that are significantly behind current major versions:
  - `pixi.js` 6.x vs upstream 8.x — flag as a known major migration on the roadmap; assess whether v6 is still receiving security updates.
  - `@mantine/*` 4.x — well behind current; assess upgrade path and risk.
  - `zustand` 3.x — current is much higher; assess.
  - `react` 18.x — current major; fine.
- Are there unused dependencies? Inspect `package.json` against actual imports in `src/`.
- Are devDependencies leaking into the production bundle? (Check Vite build output.)
- Is the Node engine constraint (`>=20`) respected by all tooling?
- Is there an `.nvmrc` or `.node-version` to pin local Node version for contributors?
- Run `npm outdated` and report — distinguish security-relevant updates from feature updates.

---

## Section 7: Build, Container & Deployment Readiness

- Does `npm run build` succeed cleanly? Are there warnings?
- Does the Dockerfile build cleanly? Multi-stage build → nginx serving `dist/` is the expected pattern.
- Is the resulting image size reasonable? (Should be well under 100 MB for a static SPA on nginx-alpine.)
- Is there a `.dockerignore`? Does it exclude `node_modules`, `.git`, `dist/`, `playwright-out/`, `graphify-out/`, `.env*`?
- Does the container expose a sensible port and have a healthcheck?
- Is the nginx config tuned for SPA serving (`try_files $uri $uri/ /index.html`)?
- Is caching configured correctly (long max-age for hashed assets, no-cache for `index.html`)?
- Is `restart.sh` documented? What does it do and when should it be used?
- Is there CI (GitHub Actions or similar) running lint, type-check, unit tests, build, and ideally e2e on every push? If absent, flag as a High finding — this is a release-blocker for an open-source project.

---

## Section 8: Accessibility (a11y) & UX

Because Axonometra is a UI-first product, a11y is a real concern, not a checkbox.

- Are interactive UI elements (Mantine controls, custom buttons, navbar items) keyboard-navigable?
- Do dialogs (HelpDialog, WelcomeModal) trap focus correctly and return focus on close?
- Are ARIA labels present on icon-only controls?
- Does the editor canvas have any keyboard accessibility for selection / placement, or is it pointer-only? If pointer-only, is that documented as a known limitation?
- Are colour contrasts sufficient for UI text and editor overlays?
- Is the app usable at 200% browser zoom?
- Does the app work on touch devices? Is touch handled distinctly from mouse where needed?
- Is `react-device-detect` being used to gate features by device — and if so, is the fallback experience reasonable?

---

## Section 9: Open-Source Project Hygiene

Because this is a public open-source project under MIT, additional considerations apply:

- **Attribution:** is upstream Arcada / Nicoleta Mehanix attribution preserved in `LICENSE` and `README.md`?
- **License headers:** are individual source files headed with license notices? (Optional but common.)
- **`CODE_OF_CONDUCT.md`:** present?
- **`CONTRIBUTING.md`:** present? Does it cover dev setup, lint/format expectations, commit/PR conventions?
- **Issue / PR templates:** present under `.github/`?
- **Security policy (`SECURITY.md`):** is there a contact / disclosure process?
- **Release process:** is there a tagged release strategy? Stage 3 tagged v0.1.0 — is there a CHANGELOG?
- **Public-facing URLs:** the README references `https://axonometra.com`. Does that match the deployed project site? Are there any references to old `arcada.*` URLs that should be updated? (Stage 3 covered code-level rename; double-check.)
- **Embeddability commitments:** is the public-facing site or README making claims about embeddability that the code actually supports?

---

## Section 10: Upstream Drift & Fork Hygiene

Axonometra explicitly does not merge upstream changes back, and does not pull from upstream. Nonetheless, fork hygiene matters:

- Are there files, references, or assets that still carry the upstream `arcada` brand and should be renamed? (Stage 3 covered the major code paths — confirm no stragglers in tests, comments, assets, e2e fixtures, or build config.)
- Are there upstream features that have been disabled but not removed? If so, are they documented as roadmap items or candidates for deletion?
- Is the upstream Apache-2.0 NOTICE (if any) preserved correctly under MIT relicensing?
- Has any upstream security advisory been published since the fork that needs cherry-picking?

---

## Section 11: TODO & Stage Review Cross-Reference

Before completing the review, read `TODO.md` and `STAGE2-REVIEW.md` (and any later stage review files) in full.

For each finding in this review:
- If it matches or relates to a `TODO.md` item, cross-reference inline at the end of the finding:
  See also: TODO.md — "@id(axo-NNN) brief task text"
- If it matches a Stage review finding (e.g. F-12 in STAGE2-REVIEW.md), mark the finding as Recurring and cross-reference:
  Status: Recurring (STAGE2-REVIEW.md F-12)

Do not enumerate every TODO item in the output. Only surface them when directly relevant to a finding you have already made independently. This cross-referencing lets the reader prioritise findings the team has already acknowledged.

---

## Section 12: Reviewer's Discretion

Use your judgment to add any additional sections or findings not covered above. This review is intended to be exhaustive. If you identify a pattern, risk, or opportunity that does not fit the categories above, create a new section for it.

Consider these additional areas (not exhaustive — use your judgment):
- Internationalisation — is the UI ready for translation, or are strings hardcoded throughout?
- Telemetry / analytics — present? If so, what's collected and is it consent-gated?
- Error reporting — is there client-side error tracking (Sentry et al)? If so, is it scrubbing PII?
- API versioning for the plan-file format — is there a schema version field? What's the migration story?
- Browser compatibility — is there a documented support matrix? Are there polyfills shipped that no longer need to be?
- Mobile / tablet experience — is it usable on touch devices, or desktop-only?
- Print / export — is there a PDF or image export path? If so, is it accurate to scale?
- Technical debt items that don't fit elsewhere.

---

## Output Format

Structure the saved review file as follows. Use this exact structure.

---

# Axonometra Code Review — YYYY-MM-DD

**Reviewer:** Claude Opus
**Date:** YYYY-MM-DD
**Scope:** /Users/adam/Projects/axonometra/ — single-project review
**Prior reviews consulted:** [List any `code-review-*.md`, `STAGE2-REVIEW.md`, etc. found, or "None — this is the first comprehensive review"]

---

## Executive Summary

[4–6 paragraphs giving an honest overall assessment of project health. Lead with the most critical findings (security, performance hot paths, blocking gaps). Summarise key themes. Be direct — if something is in poor shape, say so. Do not pad this section.]

---

## Section 1: Repo Hygiene

[Table of required files and their status, plus narrative findings.]

---

## Section 2: Security

Priority key: 🔴 Critical | 🟠 High | 🟡 Medium | 🟢 Low

### 2a. Client-side XSS & Untrusted Content
### 2b. Embedding & Origin Boundaries
### 2c. Secrets & Credential Exposure
### 2d. Dependency Vulnerabilities
### 2e. File Save / Load Security
### 2f. Docker / nginx Configuration

For each finding use this format:

**[area] — Brief title of finding**
Severity: 🔴 Critical / 🟠 High / 🟡 Medium / 🟢 Low
Location: path/to/file.ts:line_number (omit if not file-specific)
Description: What the issue is and why it matters in concrete terms.
Recommendation: Specific, actionable steps to fix it.
Status: New | Recurring (code-review-YYYY-MM-DD.md | STAGE2-REVIEW.md F-NN)
See also: TODO.md — "@id(axo-NNN) item text" (only if applicable)

---

## Section 3: Performance

### 3a. Pixi.js Rendering & Memory
### 3b. React & State Performance
### 3c. Bundle Size & Load Performance
### 3d. Long-Session Behaviour

[Same finding format as Section 2]

---

## Section 4: Code Health & Cleanliness

### 4a. Code Quality
### 4b. TypeScript Discipline
### 4c. State Management Discipline (Zustand)
### 4d. Testing
### 4e. Configuration & Environment Management
### 4f. Linting, Formatting, and Developer Experience

---

## Section 5: Documentation

---

## Section 6: Dependency & Supply Chain Health

---

## Section 7: Build, Container & Deployment Readiness

---

## Section 8: Accessibility (a11y) & UX

---

## Section 9: Open-Source Project Hygiene

---

## Section 10: Upstream Drift & Fork Hygiene

---

## Section 11: [Additional sections at reviewer's discretion]

---

## Appendix: Finding Summary Table

Complete list of all findings across all sections, sorted by Severity (Critical to Low), then by section number.

| # | Section | Severity | Title | Status |
|---|---------|----------|-------|--------|
| 1 | Security 2a | 🔴 Critical | … | New |

**Total findings:** X (Critical: N, High: N, Medium: N, Low: N)

---

## Action Items Format

After saving the review file, create a second file `action-items-YYYY-MM-DD.md` at the same location. This file distils every finding in the review into independently-actionable work items, ordered by execution priority: Critical first, then High, then Medium (grouped by theme: Security hardening, Performance, Code health & TypeScript, Testing, Build & deployment, Documentation, Accessibility, Dependency hygiene), then Low. Omit any finding that is purely informational and produces no action.

Use this exact structure:

---

# Axonometra Action Items — YYYY-MM-DD

Derived from [code-review-YYYY-MM-DD.md](./code-review-YYYY-MM-DD.md). Items are listed in execution order: Critical first, then High, then Medium grouped by theme, then Low. Each item is independently actionable and references its finding in the review by appendix number (e.g. `#4` → row 4 of the Appendix Finding Summary Table) and originating section.

Priority key: 🔴 Critical | 🟠 High | 🟡 Medium | 🟢 Low

---

## 🔴 Critical (do first)

### 1. [Brief title]
- **Why:** [Concrete reason — what breaks or what risk exists without this fix]
- **What:** [Specific, actionable steps to resolve]
- **Where:** `path/to/file.ts:line_number` (omit if not file-specific)
- **Refs:** Review #N (Section X.y)

[Repeat for each Critical finding]

---

## 🟠 High (do before next release)

### N. [Brief title]
- **Why:** …
- **What:** …
- **Where:** …
- **Refs:** Review #N (Section X.y)

---

## 🟡 Medium — [Theme group name]

### N. [Brief title]
- **Why:** …
- **What:** …
- **Where:** …
- **Refs:** Review #N (Section X.y)

[Repeat for each Medium theme group]

---

## 🟢 Low (do when convenient)

### N. [Brief title]
- **What:** …
- **Where:** …
- **Refs:** Review #N (Section X.y)

---

*End of action items. See [code-review-YYYY-MM-DD.md](./code-review-YYYY-MM-DD.md) for full context, severity definitions, and the executive summary.*

---

Rules for writing action items:

- **Every finding with a Recommendation becomes one action item.** Do not merge unrelated findings into one item. Do not split a single finding into multiple items unless the finding explicitly identifies separable independent steps.
- **Ordering within a priority band:** sort by the section number in which the finding appeared.
- **Why is mandatory** on Critical and High items. For Medium and Low it may be omitted when the title is self-explanatory.
- **Where** should include the most specific location available: file path + line number from the finding. If the finding spans multiple files, list them all. If no specific file was identified, omit the field entirely.
- **Refs** must include the appendix row number (`#N`) and the section code (e.g. `Section 2a`, `Section 3b`). If a finding has a TODO cross-reference from Section 11, include the `@id(axo-NNN)` here too.
- **Recurring findings** (Status: Recurring in the review) should be flagged in the action item with a parenthetical: `(recurring — first seen STAGE2-REVIEW.md F-12)` appended to the Refs line.
- **Confidence: Low findings** from the review should be included but annotated: add `_Confidence: Low — [reason from review]_` as a final line in the item.
- The action items file is a separate deliverable from the review. Do not reproduce the full finding text — only the information needed to act on it.

---

## Final Instructions

- Be thorough. Read files in full. Do not skim and assume.
- Be specific. File paths and line numbers wherever possible.
- Be honest. If something is in excellent shape, say so clearly. If it is poorly maintained, say that too. The purpose of this review is to produce an accurate picture, not a polished one.
- Do not pad findings. Only include real issues — not hypothetical risks or trivial style preferences.
- When uncertain whether something is a genuine issue, include it clearly marked as: Confidence: Low — explain why you are uncertain, and what would need to be confirmed to resolve the uncertainty.
- The output file is the authoritative record of this review. Future reviews will reference it. Make it worth reading.
- Save both files when you have completed all sections. Do not save either file incrementally. Write each file in a single operation at the end. Save the review file first, then the action items file.
- **Do not `git add` or `git commit` either output file, or this instructions file.** The maintainer will handle git operations manually.
