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
- [ ] Tag v0.1.0 and push @priority(high) @effort(0.25h) @id(axo-007)

## Stage 4 — Modernization (scope driven by Stage 2)

- [ ] Pixi.js v6 → v8 migration @priority(medium) @effort(8h) @id(axo-008)
  Large diff touching the floor-plan engine; needs Stage 2 risk assessment first. Captures F-04.
- [ ] Enable TypeScript strict mode @priority(medium) @effort(2h) @id(axo-009)
  TS bumped to 5.x in Stage 3 (axo-004); turn on `strict: true` and walk the resulting errors. Captures F-08 remainder.
- [ ] Dependency upgrades (Mantine 4 → 7, Zustand 3 → 5, Vite 6 + Vitest 2, etc.) @priority(medium) @effort(6h) @id(axo-010)
  Vite/Vitest bump deferred from Stage 3 — broke `tsc -b` typecheck; needs @vitejs/plugin-react bump in same change.
- [ ] ESLint flat config + Prettier + .editorconfig @priority(medium) @effort(1h) @id(axo-011)
  Captures F-10.
- [ ] GitHub Actions: build + test + e2e on PR @priority(medium) @effort(2h) @id(axo-012)
  Captures F-11.
- [ ] WelcomeModal desktop-only gate review @priority(low) @effort(1h) @id(axo-014)
  Captures F-21 — audit pointer/touch handling in Pixi layer.
