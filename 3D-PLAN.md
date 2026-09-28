# 3D view: research and plan

Status: **proposal, 2026-09-28.** Nothing here is built yet. Before this note the
3D walk-through existed only as a roadmap line in the README and on
axonometra.com; there was no earlier design work, and the unused `three@0.140`
dependency inherited from upstream was deleted in Stage 3 (STAGE2-REVIEW F-05).

## Where we start from

- **The scene seam already exists.** `src/editor/axonometric/sceneFromPlan.ts`
  reads the live plan into plain data (walls as centre-line segments with
  thickness, furniture with kind/size/rotation, doors and windows tied to their
  wall), and `axonometric.ts` turns that into an isometric SVG with walls
  extruded to 2.7 m. A 3D renderer consumes the same `SceneFloor` data; the
  editor does not need to know it exists.
- **The saved plan is too thin for 3D.** A wall's exterior flag, and so its
  thickness, is **not saved** (`sceneFromPlan.ts` reads live floors for exactly
  this reason). That is a bug today, not only a 3D gap: a plan saved or sent
  through `axo:save` comes back with every wall interior. There are also no wall
  heights, door/window heights or sills, floor elevations, furniture heights, or
  3D model references. All of these are hard-coded constants in
  `axonometric.ts`.
- **The catalogue is three pieces of furniture** (chair, table, bed) plus a door
  and a window, all top-down SVGs. A 3D view of that is sparse whatever the
  renderer.
- **There are no rooms.** The model is a wall graph, so floors and ceilings have
  no polygon to fill. The isometric view gets away without them; a 3D view
  does not.

## Decisions

### Renderer: three.js, imperative, lazy-loaded

three.js (MIT, r186 at the time of writing), driven directly the way the editor
already drives Pixi: a lazy-loaded module mounts a canvas and reads the Zustand
stores. Not `@react-three/fiber`: it is a sound choice (r3f 9 supports React 19)
but adds a declarative layer for one view in a codebase that is imperative
everywhere else.

- `WebGPURenderer` falls back to WebGL2 on its own, so there is no second code
  path to maintain.
- Around 150 to 185 kB gzip. It must be a **dynamic import behind the 3D
  button**, like the help dialog, so an embed that never opens 3D pays nothing.
  Add a bundle-size check in CI when it lands.
- Babylon.js and PlayCanvas are permissive and capable, but carry game-engine
  weight this viewer does not need.

### Walls: build the geometry directly, no CSG

Openings are rectangular intervals along a wall, known exactly, so each wall
splits into boxes: solid runs, a lintel over each door, a sill and a lintel
around each window. This is always watertight, cheap to rebuild on every edit,
and merges into one draw call per floor. Corners are 2D mitre joins of each
wall's two face lines at the shared node, then extruded. It is the same maths
as stroking a line, done once in plan space. CSG (`three-bvh-csg`, MIT;
`manifold-3d`, Apache-2.0) is only needed if the plan grows arches or other
non-rectangular openings.

**Put the geometry in a pure module** (`src/editor/scene3d/`) with the same
rules as `axonometric.ts`: plain data in, vertices out, unit-tested without a
GPU. The mitre joins and opening splits are where the bugs will be.

### Rooms: find the enclosed regions of the wall graph

Walk the planar graph's faces (at each node, sort edges by angle and take the
next edge clockwise) to get closed room polygons for floor and ceiling slabs.
The same polygons give room areas for the 2D view later, which is a feature
people will ask for anyway. Open plans with gaps simply have no slab over the
gap, which is correct.

### Furniture: from the shared element library

**Superseded 2026-09-28.** The first version of this section proposed CC0
glTF packs (Kenney, Quaternius, Poly Haven). Instead, the catalogue now comes
from our own element library, `qant-au/elements`, which Axonometra shares with
Reticulyne (see the README). Every item there is modelled once as simple solids
at real size (boxes, cylinders, domes, extruded outlines, with surface marks),
and the plan icons are generated from that model. So:

- **The 3D view builds meshes from the same parts.** No asset pipeline, no
  third-party licences, and the 2D icon, the isometric icon and the 3D object
  always agree.
- **Heights exist today.** Every catalogue item already carries `heightM` and,
  for wall and ceiling gear, `mountM`; the axonometric view uses them.
- **Phase 3 can start with height boxes** (footprint × `heightM`) and phase 4
  swaps in the modelled parts, which the library would need to export into the
  vendored manifest (today it vendors only the plan SVGs).
- **Healthcare fixtures are parked** (decision 2026-09-28): not in scope for
  now.

### Walk-through controls

- Desktop: `PointerLockControls` for looking, with WASD/arrow keys for moving.
- Collision: `three-mesh-bvh` (MIT), a capsule swept against the wall and slab
  meshes. It slides along walls rather than snagging on them.
- Floors: teleport between storeys at a stair marker; do not simulate stairs.
- Touch: a virtual joystick on the left and drag-to-look on the right. Pointer
  Lock is unreliable on mobile.
- Accessibility, matching the keyboard work on the 2D canvas: fully
  keyboard-operable, and under `prefers-reduced-motion` offer click-to-move
  (teleport) instead of continuous walking. The orbit view is the accessible
  default; walking is the extra.

### Lighting and look

Realtime lighting, not baking, because the plan changes while you look at it:
one environment map (PMREM) plus a hemisphere and a directional light, SSAO for
corner depth, and an off switch for weak GPUs. Static geometry is merged per
floor; repeated furniture uses `InstancedMesh`. That keeps a floor to low
double-digit draw calls.

### Export

- **PNG screenshot** first: it is nearly free, and it is what the website and
  social posts need.
- **glTF/GLB** through three's `GLTFExporter` (MIT), so a plan opens in
  Blender and elsewhere.
- **IFC: not now.** The only realistic library, `web-ifc`, appears to be
  MPL-2.0, a file-level copyleft outside the permissive-only rule. It needs
  its own licence decision if a customer asks.

## Phases

Each phase ships on its own and is demoable.

1. **Plan format v2** (prerequisite; do this first whatever else happens).
   Save the exterior flag. Add optional wall height per floor, floor elevation,
   door/window height and sill, and furniture height, with v1 plans loading
   using today's constants as defaults. Update `PLAN-FORMAT.md` and
   `EMBEDDING.md`: embedding hosts store these files.
2. **Scene geometry, pure and tested:** mitred walls with openings, room
   detection, slabs. No renderer yet; unit tests only.
3. **3D orbit view** ("dollhouse"): lazy-loaded three.js, orbit/zoom/pan, show
   one floor or all floors stacked, cut-away of upper walls, footprint boxes for
   furniture, PNG export. **This is the version to launch the website with.**
4. **Furniture models:** export each element's modelled parts from the
   element library into the vendored manifest, and build the 3D meshes from
   them in place of height boxes.
5. **Walk-through:** first-person mode with collision, touch controls, the
   reduced-motion teleport mode, and storey changes.
6. **glTF export**, and embedding messages for it (`axo:export`).

Rough size: phases 1 to 3 are the bulk of the engineering and are about the
size of the axonometric view plus the keyboard work combined. Phase 4 is mostly
asset work, and its healthcare part is open-ended.

## Reference implementations (read, do not depend on)

- `react-planner` (MIT): 2D plan with a 3D view, the same shape as this task.
  Unmaintained, so use it as a design reference only.
- `blueprint3d` (furnishup): the original three.js interior planner,
  unmaintained. A community TypeScript rewrite on three r181 exists
  (`blueprint3d-modern`); check its licence before reading its code closely.
- Sweet Home 3D is GPL: study it for ideas only, never copy from it.
- Upstream arcada has no 3D code.
