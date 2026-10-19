# Keymap

Axonometra's keyboard shortcuts and pointer gestures, aligned with
[Excalidraw](https://github.com/excalidraw/excalidraw).

Someone who has just sketched in Excalidraw and then plans a floor in Axonometra
should never have to retrain. Excalidraw's own `?` help dialog is the reference: every
binding listed there is either matched here, left unbound on purpose, or listed under
[Deliberate divergences](#deliberate-divergences).

This is a specification. Where a tool does not yet do what this page says, the page is
right and the tool is behind.

Checked against Excalidraw's `packages/excalidraw/components/HelpDialog.tsx` on the
`master` branch, 2026-09-29.

## In code

The tables on this page are the `keymap` module (`src/core/keymap.ts`):
the bindings, `resolveAction()` (the matching rules below, including read-only and
not-while-typing), `formatChord()` for menus and tooltips, and `shortcutSections()` plus
`DIFFERENCES` for the `?` dialog, which `src/ui/kit` renders as `KeyboardShortcutsDialog`.
The page and the module change together.

## Principles

1. **Same action, same key.** If Excalidraw has the action, use its key, letter and
   number both.
2. **Reuse Excalidraw's modifier conventions.** `Alt`+drag copies, `Space`+drag pans,
   `Shift`+click extends a selection, `Ctrl/Cmd` is the command modifier.
3. **Free-form drawing tools are not ours.** Diamond, ellipse, freedraw, frame and the
   like have no place in technical drawings (no flowcharting or whiteboarding). Their keys stay unbound unless a divergence below takes one on purpose.
4. **A new concept takes a free key.** For something Excalidraw has no equivalent of
   (a wall, a door, a measurement), pick a key Excalidraw leaves free. Bare letters
   Excalidraw does not use: `C J M U W X Y Z`.
5. **Every divergence is written down**, here and in each tool's `?` dialog.

`Ctrl/Cmd` means `Ctrl` on Windows and Linux, `Cmd` on macOS.

## Shared set (every tool)

A binding marked _where built_ applies once the tool has the feature; until then the
key stays unbound rather than being given to something else.

### Tools

| Action                                          | Keys     | Excalidraw |
| ----------------------------------------------- | -------- | ---------- |
| Select                                          | `V`, `1` | same       |
| Hand (pan)                                      | `H`      | same       |
| Eraser (_where built_)                          | `E`, `0` | same       |
| Keep the current tool after use (_where built_) | `Q`      | same       |

### View

| Action              | Keys                  | Excalidraw |
| ------------------- | --------------------- | ---------- |
| Zoom in             | `Ctrl/Cmd` + `=`      | same       |
| Zoom out            | `Ctrl/Cmd` + `-`      | same       |
| Reset zoom          | `Ctrl/Cmd` + `0`      | same       |
| Fit everything      | `Shift` + `1`         | same       |
| Fit the selection   | `Shift` + `2`         | same       |
| Toggle light / dark | `Alt` + `Shift` + `D` | same       |
| Show this list      | `?`                   | same       |

### Edit

| Action                                               | Keys                                                                 | Excalidraw                |
| ---------------------------------------------------- | -------------------------------------------------------------------- | ------------------------- |
| Undo                                                 | `Ctrl/Cmd` + `Z`                                                     | same                      |
| Redo                                                 | `Ctrl/Cmd` + `Shift` + `Z`, `Ctrl` + `Y`                             | same                      |
| Copy, cut, paste                                     | `Ctrl/Cmd` + `C`, `X`, `V`                                           | same                      |
| Duplicate                                            | `Ctrl/Cmd` + `D`                                                     | same                      |
| Delete                                               | `Delete`, `Backspace`                                                | same                      |
| Select all                                           | `Ctrl/Cmd` + `A`                                                     | same                      |
| Deselect, cancel, leave a group                      | `Esc`                                                                | same                      |
| Nudge                                                | arrow keys; with `Shift`, a larger step                              | same                      |
| Edit the selected object's text or properties        | `Enter`                                                              | same                      |
| Edit the selected object's geometry (points, length) | `Ctrl/Cmd` + `Enter`                                                 | same ("edit line points") |
| Group, ungroup (_where built_)                       | `Ctrl/Cmd` + `G`, `Ctrl/Cmd` + `Shift` + `G`                         | same                      |
| Bring forward, send backward (_where built_)         | `Ctrl/Cmd` + `]`, `Ctrl/Cmd` + `[`                                   | same                      |
| Bring to front, send to back (_where built_)         | `Ctrl/Cmd` + `Shift` + `]` / `[`; on macOS `Cmd` + `Opt` + `]` / `[` | same                      |
| Align left, right, top, bottom (_where built_)       | `Ctrl/Cmd` + `Shift` + arrow key                                     | same                      |
| Lock or unlock the selection (_where built_)         | `Ctrl/Cmd` + `Shift` + `L`                                           | same                      |
| Find                                                 | `Ctrl/Cmd` + `F`                                                     | same                      |

Accept both the Windows and the macOS form of the ordering keys on every platform.

### Pointer and touch

| Action                              | Gesture                                         | Excalidraw |
| ----------------------------------- | ----------------------------------------------- | ---------- |
| Select                              | click                                           | same       |
| Add to or remove from the selection | `Shift` + click                                 | same       |
| Select an area                      | drag on empty canvas                            | same       |
| Pan by dragging                     | `Space` + drag, or the hand tool                | same       |
| Pan with the wheel                  | mouse wheel; `Shift` + wheel pans sideways      | same       |
| Zoom                                | `Ctrl/Cmd` + wheel, trackpad pinch, touch pinch | same       |
| Drag a copy                         | `Alt` + drag                                    | same       |
| Context menu                        | right-click                                     | same       |

In the `?` dialog a gesture's keys and pointer actions are drawn as keys, as the
keyboard rows are, with the platform's key names (`Shift` + `Click`, or `⇧` + `Click`
on macOS), and each alternative is listed on its own after "or".

The plain wheel **pans**. That is what Excalidraw does, and it suits a floor plan: a
plan is a map you move around.

## Axonometra bindings

| Action               | Keys                                           | Notes                                                           |
| -------------------- | ---------------------------------------------- | --------------------------------------------------------------- |
| Wall                 | `L`, `6`                                       | Excalidraw's line: click to add a chain, double-click to end it |
| Erase                | `E`, `0`                                       | Excalidraw's eraser, exactly                                    |
| Window               | `W`                                            | free in Excalidraw                                              |
| Door                 | `D`                                            | takes Excalidraw's diamond key; see below                       |
| Measure              | `M`                                            | free in Excalidraw                                              |
| Edit a wall's length | `Ctrl/Cmd` + `Enter`, or double-click the wall | was bare `L`, which is now the wall tool                        |
| Save                 | `Ctrl/Cmd` + `S`                               | stops the browser's own save dialog                             |

**Keyboard cursor.** With the canvas focused from the keyboard, the arrow keys move a
cursor (with `Shift`, further), `Enter` or `Space` acts at the cursor, and `Esc`
cancels. This is the keyboard route to everything a pointer does, so it stays. `Space`
here is a key press, and `Space` + drag is a pointer gesture, so they do not collide.

**Walk mode (3D).** While walking, the view has its own keys and the tool keys above
are inactive: `W` `A` `S` `D` or the arrow keys move, `Q` and `E` turn, `Page Up` and
`Page Down` change storey.

## Deliberate divergences

Excalidraw bindings that are not matched, and why.

| Excalidraw key                                     | Excalidraw action                    | Here                                  | Why                                                                                     |
| -------------------------------------------------- | ------------------------------------ | ------------------------------------- | --------------------------------------------------------------------------------------- |
| `D`, `3`                                           | diamond                              | `D` is Axonometra's door; `3` unbound | No free-form shapes, so its letter goes to the object a floor planner reaches for most. |
| `O`, `4`                                           | ellipse                              | unbound                               | No free-form shapes.                                                                    |
| `P`, `7`                                           | freedraw                             | unbound                               | No free-form shapes.                                                                    |
| `F`                                                | frame                                | unbound                               | No frames.                                                                              |
| `K`                                                | laser pointer                        | unbound                               | Presentation tool.                                                                      |
| `I`                                                | eye-dropper                          | unbound                               | No colour picking from the canvas.                                                      |
| `B`                                                | bucket fill                          | unbound                               | Colour is set in the properties panel.                                                  |
| `N`                                                | sticky note                          | unbound                               | Whiteboarding.                                                                          |
| `S`, `G`                                           | stroke, background colour            | unbound                               | Colour is set in the properties panel.                                                  |
| `Shift` + `F`                                      | font picker                          | unbound                               |                                                                                         |
| `Shift` + `H`, `Shift` + `V`                       | flip                                 | unbound                               | A floor plan object is rotated, not mirrored.                                           |
| `Tab`, `Shift` + `Tab`                             | change shape type                    | unbound                               | No free-form shapes.                                                                    |
| `Ctrl/Cmd` + arrow, `Alt` + arrow                  | create and walk a flowchart          | unbound                               | Flowcharting.                                                                           |
| `Ctrl/Cmd` + `K`                                   | link                                 | unbound                               |                                                                                         |
| `Ctrl/Cmd` + `Alt` + `C` / `V`                     | copy and paste styles                | unbound                               |                                                                                         |
| `Alt` + `Z`, `Alt` + `R`, `Alt` + `S`, `Alt` + `/` | zen mode, view mode, snapping, stats | unbound                               | View mode belongs to the host (a read-only embed); the others have no equivalent yet.   |
| `Page Up` / `Page Down`                            | scroll the canvas                    | Axonometra walk mode: change storey   | Only while walking in 3D.                                                               |

## Rules for implementing it

- **Not while typing.** No binding fires while focus is in an input, a text area or
  editable text; the field keeps its own keys, including its own undo.
- **Match on `event.code` for `Alt` chords** (`KeyI`, `KeyD`, `BracketRight`). On
  macOS, `Option` turns letters into other characters, so `event.key` misses them.
- **Read-only embeds drop every editing binding.** Selecting, panning, zooming, fit,
  find, the theme toggle and `?` still work.
- **List it in the `?` dialog.** Each tool's dialog shows its bindings from this page
  and a short "Differences from Excalidraw" note taken from the table above.
- **Changing this page changes the tools.** A new binding is added here first, then
  in each tool.
