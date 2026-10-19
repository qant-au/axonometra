# Element library

The furniture, fixtures, comms and security equipment Axonometra draws: one set of
groups, ids and look. Doors and windows are not here yet; they are the editor's
built-in wall fittings (`src/res/catalog/wall-fittings.json`).

Each element is modelled **once**, as a few simple solids at real size in
centimetres. Every view is generated from that model:

- **Plan**: top-down, true to scale.
- **3D** (the 3D view): the same solids as meshes, from `models.json`
  (solids with colours resolved; decals left out).

## What belongs in the library

The library holds **physical things**: anything with a real size that can be
placed on a floor plan. An element has no ports and knows nothing about
connections. A tool with its own catalogue (a network diagram's devices and
ports, say) can relate an entry to an element by a **free-form
cross-reference**, in the same `{ source, ref }` shape a scene uses for
[links to external tools](../docs/scene-format.md#links-back-to-external-tools);
neither schema depends on it.

## Develop

```sh
npm run test:elements          # rules every element must meet
npm run build:elements         # src/res/catalog/elements/: manifest.json, models.json, plan/<id>.svg
npm run sheet                  # elements/review/<group>.png contact sheets
npm run sheet -- comms         # one group
```

The build output is committed, so the editor needs no build step for it. Rebuild after
changing an element and commit the result with the change.

## Layout

| Path                               | What                                                  |
| ---------------------------------- | ----------------------------------------------------- |
| `src/groups.mjs`                   | The groups, in display order.                         |
| `src/elements/<group>.mjs`         | The elements of one group (default export: an array). |
| `src/palette.mjs`                  | Colours and line weights.                             |
| `src/render/plan.mjs`, `model.mjs` | The plan renderer and the 3D model.                   |
| `ITEMS.md`                         | The item list: the ids, names and sizes built from.   |
| `test/`                            | The rules (`node --test`).                            |
| `scripts/build.mjs`, `sheet.mjs`   | The build and the review sheets.                      |

## An element

```js
{
  id: 'sofa-3',              // kebab-case, unique, never renamed once shipped
  name: 'Sofa, 3-Seat',      // Title Case; a test enforces it
  group: 'living',
  tags: ['network'],         // optional: network, power, cooling, security, fire, av, safe
  size: { w: 210, d: 90, h: 85 },  // cm: width (x), depth (y), height (z)
  mount: 210,                // optional: cm from mountFrom (wall and ceiling gear)
  mountFrom: 'floor',        // optional: 'floor' (default; mount = underside above the floor),
                             //   'ceiling' (mount = gap from the ceiling to the top; 0 = flush,
                             //   negative = recessed, the top that far above the ceiling)
                             //   or 'surface' (mount = gap above the item it stands on,
                             //   on the floor when it stands on nothing)
  facing: 'up',              // optional: 'up' (default) or 'down', e.g. a dome camera or downlight
  surface: 73,               // optional: cm from the underside to a top that carries other
                             //   items (desks, tables, benches, base cabinets); <= size.h
  parts: [ /* solids, below */ ],
  plan: [ /* optional decals drawn on top of the plan, in footprint cm */ ],
  symbol: { /* optional: draw on plans as a 40 cm symbol, below */ }
}
```

**Axes.** x runs left to right, y runs **back to front**, z runs up. The back
of the element (the side against a wall) is at y = 0, the top edge of the plan;
the side you use it from faces y = d, the bottom edge. Doors and fronts face the
bottom.

**Mounting and facing.** Parts are always authored facing up, z counting up from the
underside; `facing: 'down'` mirrors them inside the item's height. `mountFrom` and
`facing` are decided in [the scene format](../docs/scene-format.md#mounting-and-facing-version-2)
and are in scene format version 2. Every element with a `mount` names its `mountFrom`:
ceiling gear (detectors, dome cameras, access points, ceiling speakers, the AC
cassette, cable tray, downlights, pendant lights) is `'ceiling'`, most of it flush
(`mount: 0`) and facing down, recessed items at a negative `mount`;
wall gear stays `'floor'`. Items put on top of something else stand on it: an element
whose top carries things (tables, desks, benches, base cabinets, sideboards, TV units,
bedside tables, filing cabinets) gives that top's height as `surface`, and bench-top
gear (monitors, the laptop, the desk phone, the router and desktop switch, the NAS, the
microwave, the table lamp) is `mountFrom: 'surface'`, standing on whatever carrying item an editor places
it over and on the floor when there is none. The views show an element as installed:

- **3D** (`models.json`): the solids mirrored; a dome that narrows downwards carries
  `down: true`.
- **Plan**: drawn as authored, because a ceiling item on a plan is read as a reflected
  ceiling plan, looking up at its face. An element with `mountFrom: 'ceiling'` has its
  outline dashed, the reflected-ceiling-plan convention (`planSvg(el, { reflected:
false })` turns it off).

### Parts

Solids, in cm, all inside `size`, never overlapping each other (a test enforces
it for boxes).

| Part                               | Shape                                                                                     |
| ---------------------------------- | ----------------------------------------------------------------------------------------- |
| `{ x, y, z, w, d, h, r? }`         | Box. `r` rounds its corners on the plan.                                                  |
| `{ cyl: [cx, cy, rx, ry?], z, h }` | Vertical cylinder, elliptical if `ry` is given.                                           |
| `{ dome: [cx, cy, r], z, h }`      | Dome (camera domes, lights).                                                              |
| `{ poly: [[x, y], ...], z, h }`    | Extruded polygon for L-shapes and curves. List points **clockwise** on the plan (y down). |

Common part options: `role` (fill, default `body`), `outline` (`true` draws
the part with the heavy plan outline; the first part has it unless it sets
`outline: false`), `dash` (a dashed plan outline, e.g. `'6 4'`, for overhead
items such as skylights), and `top`: decals drawn on the part's top face.

**Roles:** `body`, `soft` (cushions, tops, trays), `dark` (equipment),
`metal`, `wood`, `glass` (glass and water), `plant`, `ground` (rugs, paving).

### Decals

Marks on a part's top face, in cm relative to the top-left corner of the
part's bounding box on the plan (for a `cyl`, `dome` or `poly`, the box around
it, not the plan origin).

| Decal                                                  | Draws                                            |
| ------------------------------------------------------ | ------------------------------------------------ |
| `{ line: [[u, v], ...], closed? }`                     | Polyline or polygon.                             |
| `{ rect: [u, v, w, h], r? }`                           | Rectangle.                                       |
| `{ circle: [u, v, r] }`, `{ ellipse: [u, v, rx, ry] }` | Circle, ellipse.                                 |
| `{ arc: [cx, cy, r, fromDeg, toDeg] }`                 | Arc (0° = +x, 90° = +y, i.e. towards the front). |

Options: `fill` (a role or accent), `stroke` (a role, `outline` or `detail`;
default `detail`), `accent` (a tag colour, filled, for LEDs and status marks),
`dash`, `weight: 'outline'` (heavy line), and `view: 'plan'` to draw it on the
plan only. A decal on `top` that only makes sense seen from above (louvres, seat
lines on an item mounted high) takes `view: 'plan'`.

### Symbols

Ceiling and wall devices (cameras, detectors, access points, sensors, call
points) are far too small to see at plan scale. They set `symbol`, and the plan
draws a **40 × 40 cm** frame with a pictogram instead of the model, while
`size` and `parts` still describe the real device for the 3D view.

```js
symbol: {
  frame: 'circle',   // or 'square'
  glyph: [ /* decals in the 40 × 40 box; default stroke is the outline colour */ ]
}
```

Point directional devices (cameras, sirens, exit signs) towards the **bottom**
of the symbol.

## House style

- **Recognisable at 1:50, no more.** A plan is read from across a room, not
  inspected. Aim for 5 to 25 marks per element; the plan SVG must stay under
  4 KB (a test enforces it).
- **Colour carries meaning, sparingly.** Bodies are off-white or grey; accent
  colours mark a device's kind (blue network, orange power, teal cooling, red
  security and fire, purple AV, green safe: first aid and evacuation) in one small place: a status strip, a lens, a
  panel. Never a whole body.
- **Model real sizes.** Take dimensions from common Australian products; the
  sizes in `ITEMS.md` are the brief.
- **Families from functions.** When items differ only in size (beds, racks,
  wardrobes, desks), write one function and call it per size, as
  `bed()` in `bedroom.mjs` and `rack()` in `comms.mjs` do.

Every element is drawn here, from scratch; nothing is copied from a third-party icon
set.
