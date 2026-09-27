# Axonometra

An open-source 2D floor planner for the browser. Walls, doors, windows, fixtures, furniture, multiple floors, accurate-to-scale measurement — with axonometric and 3D walk-through views on the roadmap.

Built for healthcare facility layouts, small-building design (sheds, bunkers, ADUs), and any place a fast, embeddable plan editor is wanted (see [EMBEDDING.md](./EMBEDDING.md) for the iframe + postMessage contract).

🌐 **Project site:** https://axonometra.com

![React](https://img.shields.io/badge/react-%2320232a.svg?logo=react&logoColor=%2361DAFB)
![Pixi.JS](https://img.shields.io/badge/Pixi.JS-EF2D5E)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![License: MIT AND Apache-2.0](https://img.shields.io/badge/License-MIT%20AND%20Apache--2.0-yellow.svg)

## Status

v0.3.0 — Stages 4 and 5 are complete (lint, strict TS, unit and e2e tests in CI; Pixi 8, Mantine 9, Zustand 5, React 19). Expect breaking changes until v1.0.0.

Furniture, doors, and windows ship from a small built-in catalog under `src/res/catalog/`. Extend it by editing the JSON manifests and dropping SVGs into `src/res/catalog/images/`. The upstream `arcada-backend` Express server is **not** required.

## Relationship to Arcada

Axonometra is a fork of [mehanix/arcada](https://github.com/mehanix/arcada), originally written by [Nicoleta Mehanix](https://github.com/mehanix) as a Bachelor's thesis project. We're enormously grateful for the foundation — the floor-plan engine, the React + Pixi.js architecture, the UX — all originated there.

**Why the rename?**

- To avoid confusion with the upstream `arcada` brand, which retains its own identity, demo, and direction.
- To signal a different long-term trajectory: Axonometra is maintained under the QANT umbrella as a browser-embeddable plan editor (see [EMBEDDING.md](./EMBEDDING.md)) with a roadmap (axonometric / 3D walk-through views, healthcare and small-building presets) that diverges from upstream.
- To match the public brand at [axonometra.com](https://axonometra.com).

We do **not** plan to merge changes back upstream, nor to pull from upstream. **License: MIT AND Apache-2.0.** Code carried over from upstream stays under Apache-2.0 (full text in [`LICENSE-APACHE`](LICENSE-APACHE)); Axonometra's own changes and additions are MIT. Attribution to the original author is maintained in `LICENSE` and in this README.

If you're looking for the original Arcada — including its server (`arcada-backend`), the original demo at `arcada.nicoleta.cc`, and the documentation PDF — please visit the [upstream repo](https://github.com/mehanix/arcada).

## Tech stack

- **Client**: React + TypeScript
- **Floor-plan engine**: custom-built on [Pixi.js](https://pixijs.com)
- **State**: [Zustand](https://github.com/pmndrs/zustand)
- **UI**: [Mantine](https://mantine.dev) + Tabler Icons
- **Build**: Vite + Vitest
- **End-to-end**: Playwright

## Quick start

```bash
npm install
npm run dev
```

Run `bash restart.sh NO_WATCH=1` for a containerised local preview, `npm run test` for unit tests, `npm run test:e2e` for the Playwright smoke spec.

## Saving & loading

- **Ctrl+S** saves the current plan to your browser's local storage.
- The toolbar **Save** button downloads the plan as an `axonometra-plan-*.json` file.
- Load a plan from the welcome dialog ("Load from disk" / "Load from local save") or the toolbar's **Load plan** button.
- Saving is manual — there is no periodic autosave.

## Undo & redo

- **Ctrl+Z** (Cmd+Z on macOS) undoes the last edit; **Ctrl+Shift+Z** or **Ctrl+Y** redoes it. The toolbar has **Undo** and **Redo** buttons too.
- One step is one canvas click or drag (a wall segment, a moved node, a placed or resized piece of furniture), or one toolbar edit (adding or deleting a floor, adding furniture from the drawer).
- History holds the last 100 steps and is cleared when a plan is loaded.

## Accessibility

The editor canvas is currently **pointer-only**: walls, furniture, and handles are
placed and manipulated with the mouse or touch, and there is no keyboard path for
drawing on the canvas yet. Full canvas keyboard navigation is planned for a later
stage. The surrounding UI chrome is keyboard-operable — toolbar buttons are reachable
by Tab, expose accessible labels, and show a visible focus ring.

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for setup and conventions. Everyone taking part is expected to follow the [Code of Conduct](CODE_OF_CONDUCT.md). Report security issues privately as described in [`SECURITY.md`](SECURITY.md).

## License

Dual-licensed, `MIT AND Apache-2.0`. Code that originated in upstream Arcada remains under the [Apache License 2.0](LICENSE-APACHE), reproduced verbatim with its copyright notice. Axonometra's modifications and new contributions are under the [MIT License](LICENSE). See [`LICENSE`](LICENSE) for how the two apply.
