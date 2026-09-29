# Axonometra

An open-source floor planner for the browser, with a 3D view. Walls, doors, windows,
furniture and IT and security equipment, multiple floors, true-to-scale measurement, an
axonometric view, and a 3D view you can orbit, walk through in first person, and export.
Use it on its own, or embed it in your own application.

**Project site:** [axonometra.com](https://axonometra.com)

![License: MIT AND Apache-2.0](https://img.shields.io/badge/License-MIT%20AND%20Apache--2.0-yellow.svg)

## Status

Pre-1.0 (currently v0.3). The embedding API and the plan format can still change
between minor versions; each change is recorded in [CHANGELOG.md](CHANGELOG.md).

## Features

- **Plan editing.** Walls, doors and windows, rooms and multiple floors, drawn to a
  10 cm grid and measured true to scale.
- **Around 230 items** in 12 groups: living, bedroom, dining, kitchen, bathroom,
  office, comms and server room, networking, security, fire and safety, outdoor and
  structure.
- **Axonometric view** of the plan.
- **3D view.** Orbit, or walk through in first person with collision and storey
  changes. Save an image, or export the whole building as a `.glb` (glTF) file for
  Blender and other 3D tools.
- **Embeddable.** An iframe and `postMessage` contract for host applications; see
  [EMBEDDING.md](EMBEDDING.md).
- **Keyboard accessible.** The toolbar and the canvas can both be driven from the
  keyboard (see below).

## Getting started

```bash
git clone https://github.com/qant-au/axonometra.git
cd axonometra
npm install
npm run dev
```

To embed Axonometra in another application, see [EMBEDDING.md](EMBEDDING.md). The saved
plan format is documented in [PLAN-FORMAT.md](PLAN-FORMAT.md).

## Using it

### Saving and loading

- **Ctrl+S** (Cmd+S on macOS) saves the current plan to your browser's local storage.
- The toolbar **Save** button downloads the plan as an `axonometra-plan-*.json` file.
- Load a plan from the welcome dialog ("Load from disk" / "Load from local save") or the
  toolbar's **Load plan** button.
- Saving is manual; there is no periodic autosave.

### 3D view

The toolbar's **3D view** button shows the plan as a 3D model: walls with their door
and window openings, a floor and ceiling for each room, and furniture drawn from each
item's 3D model. Drag to turn it, right-drag or use the arrow keys to move, and scroll
to zoom. **Walk** switches to a first-person view; with reduced motion turned on it
moves by teleporting instead. **Cut away walls** (on by default) cuts the walls off at
1.2 m so you can see into the rooms, **All floors** stacks every floor, **Save image**
downloads a PNG, and **Save 3D model** downloads the building as a `.glb` file. It needs
WebGL, and three.js is only downloaded the first time the view is opened.

### Undo and redo

- **Ctrl+Z** (Cmd+Z on macOS) undoes the last edit; **Ctrl+Shift+Z** or **Ctrl+Y**
  redoes it. The toolbar has **Undo** and **Redo** buttons too.
- One step is one canvas click or drag (a wall segment, a moved node, a placed or
  resized piece of furniture), or one toolbar edit.
- History holds the last 100 steps and is cleared when a plan is loaded.

### Keyboard

The toolbar is keyboard-operable: buttons are reachable by Tab, expose accessible
labels, and show a visible focus ring.

The canvas can be edited from the keyboard too. Tab to it (it is announced as the
"Floor plan" application) and a cursor appears on the plan:

| Key                         | Does                                                                                                             |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Arrow keys                  | Move the cursor 10 cm (one grid cell)                                                                            |
| Shift + arrow keys          | Move the cursor 1 m                                                                                              |
| Enter or Space              | Use the selected tool at the cursor: place a wall point, delete what is there, or add a door or window to a wall |
| Enter or Space in Edit mode | Pick up the wall point, wall or piece of furniture under the cursor; arrows move it, Enter puts it down          |
| Escape                      | Cancel a move, or end wall drawing                                                                               |
| Ctrl/Cmd + Z                | Undo                                                                                                             |

Every action is announced through a polite live region, including refusals such as
deleting a wall point that still has walls attached. Doors and windows move with their
wall and cannot be picked up on their own. Resizing and rotating furniture still needs
the pointer.

## A sibling project: Reticulyne

Axonometra has a sibling, [Reticulyne](https://github.com/qant-au/reticulyne), an
open-source isometric network-diagram editor. They are built to be used together:

- **Axonometra** lays out physical space at true scale: rooms, racks, cameras, access
  points and furniture.
- **Reticulyne** draws how those things connect.

Both draw their equipment from one shared element library, so a rack is the same rack,
at the same size and in the same colours, in a floor plan and in a network diagram.

## Contributing

Issues and pull requests are welcome.

- **Found a bug, or have an idea or a question?**
  [Open an issue](https://github.com/qant-au/axonometra/issues/new/choose). For anything
  substantial, open the issue before writing code so we can agree on the scope.
- **Sending a pull request?** Read [CONTRIBUTING.md](CONTRIBUTING.md) for setup, checks
  and conventions.
- **Found a security problem?** Report it privately, as described in
  [SECURITY.md](SECURITY.md).

Everyone taking part is expected to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Author

Created and maintained by **Adam Burgess** ([adamburgess.me](https://adamburgess.me)).
Adam is available for customer implementation work through
[QANT Pty Ltd](https://qant.au).

## Origins and license

Axonometra started as a fork of [Arcada](https://github.com/mehanix/arcada), written by
Nicoleta Mehanix as a Bachelor's thesis project. It is dual-licensed `MIT AND
Apache-2.0`: code that originated in Arcada stays under the
[Apache License 2.0](LICENSE-APACHE), reproduced verbatim with its copyright notice, and
Axonometra's own changes are under the [MIT License](LICENSE). [LICENSE](LICENSE)
explains how the two apply.
