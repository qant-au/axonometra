# Axonometra

An open-source 2D floor planner for the browser. Walls, doors, windows, fixtures, furniture, multiple floors, accurate-to-scale measurement — with axonometric and 3D walk-through views on the roadmap.

Built for healthcare facility layouts, small-building design (sheds, bunkers, ADUs), and any place a fast, embeddable plan editor is wanted.

🌐 **Project site:** https://axonometra.com

![React](https://img.shields.io/badge/react-%2320232a.svg?logo=react&logoColor=%2361DAFB)
![Pixi.JS](https://img.shields.io/badge/Pixi.JS-EF2D5E)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

## Status

Pre-release. This repository is currently undergoing a rename, build-tooling migration (CRA → Vite), and modernization pass under the QANT umbrella. Expect breaking changes until v0.1.0 is tagged.

## Relationship to Arcada

Axonometra is a fork of [mehanix/arcada](https://github.com/mehanix/arcada), originally written by [Nicoleta Mehanix](https://github.com/mehanix) as a Bachelor's thesis project. We're enormously grateful for the foundation — the floor-plan engine, the React + Pixi.js architecture, the UX — all originated there.

**Why the rename?**

- To avoid confusion with the upstream `arcada` brand, which retains its own identity, demo, and direction.
- To signal a different long-term trajectory: Axonometra is maintained under the QANT umbrella as a browser-embeddable plan editor with a roadmap (axonometric / 3D walk-through views, healthcare and small-building presets) that diverges from upstream.
- To match the public brand at [axonometra.com](https://axonometra.com).

We do **not** plan to merge changes back upstream, nor to pull from upstream. **License: MIT** (relicensed from upstream Apache-2.0; see `LICENSE` for upstream attribution). Attribution to the original author is maintained in `LICENSE` and in this README.

If you're looking for the original Arcada — including its server (`arcada-backend`), the original demo at `arcada.nicoleta.cc`, and the documentation PDF — please visit the [upstream repo](https://github.com/mehanix/arcada).

## Tech stack

- **Client**: React + TypeScript
- **Floor-plan engine**: custom-built on [Pixi.js](https://pixijs.com)
- **State**: [Zustand](https://github.com/pmndrs/zustand)
- **UI**: [Mantine](https://mantine.dev) + Tabler Icons
- **Build**: Create React App _(migrating to Vite in v0.1.0)_

## Quick start

```bash
npm install
npm start
```

> **Note:** quickstart commands will change to `npm run dev` once the Vite migration lands (tracked in `TODO.md`).

## License

[MIT](LICENSE) — relicensed from upstream Arcada's Apache-2.0; original copyright attributed in `LICENSE`. See the file for the full text.
