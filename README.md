# Axonometra

An open-source 2D floor planner for the browser. Walls, doors, windows, fixtures, furniture, multiple floors, accurate-to-scale measurement — with axonometric and 3D walk-through views on the roadmap.

Built for healthcare facility layouts, small-building design (sheds, bunkers, ADUs), and any place a fast, embeddable plan editor is wanted (see [EMBEDDING.md](./EMBEDDING.md) for the iframe + postMessage contract).

🌐 **Project site:** https://axonometra.com

![React](https://img.shields.io/badge/react-%2320232a.svg?logo=react&logoColor=%2361DAFB)
![Pixi.JS](https://img.shields.io/badge/Pixi.JS-EF2D5E)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

## Status

v0.2.0 in flight — Stage 4 (lint, strict TS, unit tests, CI) is complete; Stage 5 (Pixi 8, Mantine 7, Zustand 5, full strictNullChecks) is in progress. Expect breaking changes until v1.0.0.

Furniture, doors, and windows ship from a small built-in catalog under `src/res/catalog/`. Extend it by editing the JSON manifests and dropping SVGs into `src/res/catalog/images/`. The upstream `arcada-backend` Express server is **not** required.

## Relationship to Arcada

Axonometra is a fork of [mehanix/arcada](https://github.com/mehanix/arcada), originally written by [Nicoleta Mehanix](https://github.com/mehanix) as a Bachelor's thesis project. We're enormously grateful for the foundation — the floor-plan engine, the React + Pixi.js architecture, the UX — all originated there.

**Why the rename?**

- To avoid confusion with the upstream `arcada` brand, which retains its own identity, demo, and direction.
- To signal a different long-term trajectory: Axonometra is maintained under the QANT umbrella as a browser-embeddable plan editor (see [EMBEDDING.md](./EMBEDDING.md)) with a roadmap (axonometric / 3D walk-through views, healthcare and small-building presets) that diverges from upstream.
- To match the public brand at [axonometra.com](https://axonometra.com).

We do **not** plan to merge changes back upstream, nor to pull from upstream. **License: MIT** (relicensed from upstream Apache-2.0; see `LICENSE` for upstream attribution). Attribution to the original author is maintained in `LICENSE` and in this README.

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

## Accessibility

The editor canvas is currently **pointer-only**: walls, furniture, and handles are
placed and manipulated with the mouse or touch, and there is no keyboard path for
drawing on the canvas yet. Full canvas keyboard navigation is planned for a later
stage. The surrounding UI chrome is keyboard-operable — toolbar buttons are reachable
by Tab, expose accessible labels, and show a visible focus ring.

## License

[MIT](LICENSE) — relicensed from upstream Arcada's Apache-2.0; original copyright attributed in `LICENSE`. See the file for the full text.
