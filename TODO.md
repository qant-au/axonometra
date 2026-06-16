---
project: axonometra
display_name: Axonometra
type: core
prefix: axo
---

# Axonometra — TODO

## Stage 2 — Project audit

- [x] Run Stage 2 project review and write STAGE2-REVIEW.md @priority(high) @effort(2h) @id(axo-001)
      Audit dimensions: CRA deprecation, Pixi 6→8, deps audit, TypeScript version, test coverage, container/CI, lint/format, dead upstream code, a11y/responsiveness, license attribution. Output drives Stage 3/4 scope.
      Done 2026-06-09 — see STAGE2-REVIEW.md (21 findings across P0/P1/P2).

## Stage 3 — Rename + Vite migration + container + e2e

- [x] Code-level rename arcada → axonometra (4 files + assets) @priority(high) @effort(1h) @id(axo-002)
      public/index.html title, src/ui/WelcomeModal.tsx, src/ui/Layout/PageLayout.tsx, ArcadaLogo asset rename. Verify grep returns zero non-README matches.
      Done 2026-06-09 — closes F-20.
- [x] Rename package.json to axonometra-core @ 0.1.0 @priority(high) @effort(0.5h) @id(axo-003)
      Current name is the typo "arkada-react". Reset to axonometra-core, keep 0.1.0.
      Done 2026-06-09 — closes F-16.
- [x] Migrate CRA → Vite + Vitest @priority(high) @effort(4h) @id(axo-004)
      Remove react-scripts, add vite + @vitejs/plugin-react, move index.html to root, swap jest for vitest, update scripts (dev/build/preview/test).
      Done 2026-06-09 — closes F-03, F-12; partial F-08 (TS 5.x done, strict→Stage 4).
- [x] Add Playwright smoke e2e @priority(high) @effort(2h) @id(axo-005)
      playwright.config.ts at root, e2e/smoke.spec.ts validates title, modal, canvas mount, against container at :4890.
      Done 2026-06-09 — closes F-09 (smoke portion).
- [x] Add Dockerfile (multi-stage build → nginx) @priority(medium) @effort(1h) @id(axo-006)
      Shipped in Stage 2 as a transitional CRA-flavoured Dockerfile; Stage 3 updated build/ → dist/ for the Vite output.
- [x] Tag v0.1.0 and push @priority(high) @effort(0.25h) @id(axo-007)
      Done 2026-06-09 — tag pushed to GitHub.

## Stage 4 — Quality foundation (lint, strict TS, tests, CI)

- [x] ESLint flat config + Prettier + .editorconfig @priority(medium) @effort(1h) @id(axo-011)
      Done 2026-06-09 — closes F-10. Mirrors reticulyne setup.
- [x] Enable TypeScript strict mode @priority(medium) @effort(2h) @id(axo-009)
      Done 2026-06-09 — strict: true plus noImplicitAny/Returns/Override + noUnusedLocals/Parameters. 129 errors → 0 across 29 source files. strictNullChecks deferred (axo-015 in Stage 5).
- [x] Vite 6 + Vitest 2 + plugin-react 5 bump @priority(medium) @effort(2h) @id(axo-010)
      Done 2026-06-09 — deferred Stage 3 audit-fix. Mantine 4→7 and Zustand 3→5 are now Stage 5 (axo-016).
- [x] Vitest unit tests — helpers + stores @priority(medium) @effort(3h) @id(axo-019)
      Done 2026-06-09 — 23 tests (14 helpers, 9 stores). Closes F-09 expansion portion.
- [x] GitHub Actions CI (lint + format + tsc + test + build) @priority(medium) @effort(2h) @id(axo-012)
      Done 2026-06-09 — closes F-11. Playwright-in-CI deferred (axo-017).
- [x] Tag v0.2.0 and push @priority(high) @effort(0.25h) @id(axo-013)
      Done 2026-06-09 — tag pushed to GitHub; package.json bumped to 0.2.0.

## Stage 5 — Breaking library bumps + responsiveness (post-v0.2.0)

- [ ] Pixi.js v6 → v8 migration (ladder via v7) @priority(medium) @effort(8h) @id(axo-008)
      Captures F-04. Stage 4 test net + CI cover regressions.
      During migration: verify all Container/Graphics subclasses initialise correctly under useDefineForClassFields: true (tsconfig.json:23). Pixi v8 changes the base-class field init order; if undefined inherited fields appear, flip the flag to false. Tracks action-items #20.
- [x] Enable strictNullChecks @priority(medium) @effort(4h) @id(axo-015)
      ~56 sites where Pixi parent chains are passed around without null guards. Real refactor, not mechanical.
      Done 2026-06-09 — 51 errors across 13 files, walked through in three buckets (useRef nullability, class-field widening, Map.get guards). Also closes #24 (WallNodeSequence.remove guard), #64 (useRef init + optional chaining), #15 (popup null-check). Closes finding #7 in code-review-2026-06-09.
- [ ] Mantine 4 → 7 + Zustand 3 → 5 @priority(medium) @effort(4h) @id(axo-016)
      Breaking UI/store API changes. UI surface is small (~7 components).
- [ ] WelcomeModal desktop-only gate review @priority(low) @effort(1h) @id(axo-014)
      Captures F-21.
- [ ] Add Playwright smoke step to GitHub Actions @priority(low) @effort(1h) @id(axo-017)
      Containerised, once the rest of the CI workflow has had a green run.
- [ ] Tag v0.3.0 @priority(medium) @effort(0.25h) @id(axo-018)

## Stage 6 — Architecture refactor (post-v0.3.0)

- [ ] Extract FloorPlan model state into a Zustand store @priority(medium) @effort(8h) @id(axo-020)
      FloorPlan is currently a Pixi Container + model store + persistence + singleton — four
      responsibilities in one class, and the root cause of the singleton-lifecycle work in code-review-2026-06-09 finding #5. Stage 6 splits these: - new useFloorPlanStore (floors, currentFloor, furnitureId, version) — Zustand - FloorPlan stays a Pixi Container, subscribes to the store - Serializer reads/writes the store directly, drops the Floor[] traversal - Removes the static .Instance + dispose() pair entirely
      Prereq: axo-008 (Pixi 8) so we're not refactoring against a deprecated API surface.
      Touches Floor.ts, FloorPlan.ts, Serializer.ts, every Action. See FLOORPLAN-REFACTOR.md.

## OSS hygiene

- [ ] Add CODE_OF_CONDUCT.md (Contributor Covenant 2.1) @priority(low) @effort(0.25h) @due(2026-08-16) @id(axo-021)
      Action-items batch 2026-06-16 deferred this (#78): the standard template tripped the content filter during automated authoring. Add manually — Contributor Covenant 2.1 with a maintainer enforcement contact, then link it from README and strike #78 in action-items-2026-06-09.md.
