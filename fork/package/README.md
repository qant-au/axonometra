# @axonometra/editor

Axonometra is an open-source 3D planning engine for buildings and boats: floor plans, decks and hulls
drawn to true scale, with an editor and a 3D view you can orbit or walk through. This package puts the
whole planner into any web page, with no server and no Home Assistant behind it.

Source, issues and the Home Assistant integration: <https://github.com/qant-au/axonometra>.

## Install

```sh
npm install @axonometra/editor
```

The package has no runtime dependencies: lit and three.js are bundled into the engine, and three.js sits
in its own chunk, loaded when the 3D view opens.

## Embed

```js
import { mountAxonometra, browserStore } from "@axonometra/editor";

const planner = await mountAxonometra(document.querySelector("#plan"), {
  store: browserStore("my-plan"), // the plan is kept in this browser
});

// later
planner.destroy();
```

`mountAxonometra(target, options)` loads the engine, mounts an `<axonometra-panel>` element in `target` and
resolves to `{ element, destroy() }`. It rejects if the engine cannot be loaded or the store's `load()` fails.

The planner fills `target` and keeps to it: its menus, dialogs and the first-run wizard stay inside it, so
several planners can share a page. Give `target` a height (600 px or more reads well; below about 500 px the
side lists crowd). A target with no height of its own gets the full height of the window.

| Option | Meaning |
|---|---|
| `store` | Where the plan lives (required). See [Plan stores](#plan-stores). |
| `signals` | Live data for the plan. Absent: a plan with no live data. |
| `language` | BCP 47 language. English, German, Czech, Danish, Spanish, Finnish, French, Hungarian, Italian, Norwegian (Bokmål and Nynorsk), Dutch, Polish, Portuguese, Romanian, Slovenian, Swedish and Chinese are included. Default: the browser's. |
| `admin` | Whether the viewer may open the editor. Default `true`. |
| `location` | `{ latitude, longitude, timeZone? }` for the sun and the time of day. |
| `bundleUrl` | URL of the engine's main bundle, `axonometra.js`. Default: beside the package's `index.js`. |
| `narrow` | Phone layout. Default: decided from the target's width. |
| `homeAssistant` | Shows the parts that need a Home Assistant behind the host (Assist, time travel, devices). Default `false`; leave it off unless your host bridges to one. |

### With a bundler

The engine is a set of files that load each other at run time (`axonometra.js` and the chunks, fonts,
images and languages beside it), so a bundler cannot inline it. Serve the package folder as static files
and point `bundleUrl` at it:

```js
const planner = await mountAxonometra(target, {
  store: browserStore("my-plan"),
  bundleUrl: "/vendor/axonometra/axonometra.js", // a copy of node_modules/@axonometra/editor
});
```

Without a bundler, or from a CDN that serves the package as published, the default works as it is.

## Plan stores

A store is four async methods, so a plan can live anywhere:

```ts
interface PlanStore {
  load(): Promise<{ building: Building; revision: number } | null>;
  save(building: Building, revision: number): Promise<void>;
  loadImage(id: string): Promise<string | null>;
  saveImage(id: string, data: string): Promise<void>;
}
```

Two come with the package: `browserStore(name)` keeps the plan in the browser's IndexedDB, one database
per name, and `memoryStore(initial?)` keeps it for the session only (tests and demos).

## Live data

A signal source gives the plan its live states, one per signal id, and is told when the plan acts on one.
`staticSignals()` is the simplest: a map of states the page sets.

```js
import { mountAxonometra, memoryStore, staticSignals } from "@axonometra/editor";

const signals = staticSignals({ "sensor.fuel": { state: "62", attributes: { unit_of_measurement: "%" } } });
await mountAxonometra(target, { store: memoryStore(), signals });
signals.set("sensor.fuel", "61");
```

## A host of your own

`mountAxonometra` is built on `createHass(options)`, which answers the engine's calls from a store and a signal
source in the shape the engine speaks. Most pages never need it; it is exported for hosts that mount the
`<axonometra-panel>` element themselves.

## Example plans

```js
import { memoryStore, mountAxonometra } from "@axonometra/editor";
import { examplePlan } from "@axonometra/editor/plans";

const { building } = examplePlan("family-home-two-storey");
await mountAxonometra(target, { store: memoryStore({ building }) });
```

Buildings: `family-home-two-storey`, `ranch-home-basement`, `acreage-home`, `peptide-lab`,
`real-estate-office`, `shed-workshop`. Vessel: `fishing-boat-6.5m`.

## Versions

Pre-1.0. Releases step the patch number (0.8.1, 0.8.2 and so on) until 1.0.0; anything that changes how a
page embeds the planner is called out in the [CHANGELOG](./CHANGELOG.md).

## Licence

MIT, copyright Adam Burgess. Axonometra is based on NeonPlan 3D by Mastershort (MIT); both copyright lines
are in [LICENSE](./LICENSE), and [NOTICE](./NOTICE) credits the other work it includes. The bundled fonts
carry their own licences beside them in `fonts/`.
