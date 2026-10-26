# Demos

The animated GIFs in [`docs/demos`](../docs/demos) are recorded from Accurona itself. Nothing is drawn for the
recording: each GIF is the planner's 3D view or the hull viewer showing one of the built-in examples, turned a full
circle. They are previews of work in progress.

## Homes and Rooms

Recorded by [`plans.mjs`](plans.mjs) from the example plans in
[`frontend/src/plans/examples.ts`](../frontend/src/plans/examples.ts). Each is an original layout of a common type
(nothing traced from a published plan), drawn as rooms with their doors, windows and stairs. None is furnished yet: these
are the structure, a base for later work. The roof is hidden so the rooms show; the buildings have one in the
planner.

| Recording | What it shows |
|---|---|
| `plan-family-home-two-storey` | A two-storey family home, 12 x 16 m: four bedrooms, study, rumpus room and double garage |
| `plan-ranch-home-basement` | An American single-storey ranch home with a full basement and a two-car garage, 20 x 11 m |
| `plan-acreage-home` | A large single-storey acreage home, 40 x 13 m: five bedrooms, rumpus room, study and triple garage |
| `plan-peptide-lab` | A small custom peptide laboratory: a clean suite behind personnel and material airlocks |
| `plan-real-estate-office` | A shopfront real estate office for eight staff: reception, interview rooms, open office, kitchen and washrooms |
| `plan-shed-workshop` | A 10 x 10 m steel shed: an oversized double garage, a workshop and a store |

The lab and the office are rooms fitted out inside a larger building, which is the point of them: Accurona plans a room
or a suite of rooms as readily as a whole building. The standalone page opens any of them with
`index.html?example=<name>`.

## Boats and Ships

Recorded by [`hulls.mjs`](hulls.mjs) from the hull viewer ([`frontend/src/hull/viewer.ts`](../frontend/src/hull/viewer.ts),
`hulls.html` in the standalone build), each hull from its catalogue floating on the water.

| Recording | What it shows |
|---|---|
| `hull-sailing-yacht-10m-keel` | A 10 m sailing yacht's canoe body, with a fin keel, its bulb and a spade rudder |
| `hull-rib-6.5m-with-tube` | A 6.5 m RIB: its deep-V hull and the 0.5 m tube that sits on it |
| `hull-catamaran-12m` | A 12 m cruising catamaran: two demihulls 5.2 m apart |
| `hull-swath-25m` | A 25 m SWATH: two submerged hulls under thin struts |
| `hull-container-ship-300m` | A 300 m container ship with its bulbous bow |
| `hull-plate-alloy-fishing-6.5m` | A 6.5 m plate aluminium fishing boat: hard chine, 18° deadrise aft, a transom wide enough for twin outboards |

These are previews of the hull work: hull shapes and what is fixed to them, floating on the water. Decks, rooms,
equipment and live data come later.

## Recording

```sh
cd frontend && npm run build && node ../fork/build-standalone.mjs
node ../demos/plans.mjs                  # every plan recording
node ../demos/hulls.mjs                  # every hull recording
node ../demos/plans.mjs peptide-lab      # one of them
PREVIEW=1 node ../demos/plans.mjs        # four still frames each, in dist/demo-frames, to set a camera up
```

Both scripts serve `dist/standalone`, open the page in a headless Chrome at 800 x 450, and render the turn one frame at
a time ([`record.mjs`](record.mjs)), so the motion is exactly even whatever the machine. A turn takes 12 seconds (a
comfortable 6, played at half speed) at 15 frames a second. The frames become a GIF with `ffmpeg`, and `gifsicle`
shrinks it when it is installed. The plans' camera height and distance, and the hulls' camera height, are set at the
top of each script; `CHROME_PATH` overrides the browser.
