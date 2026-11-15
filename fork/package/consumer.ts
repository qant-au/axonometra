// Axonometra: a consumer of the npm package's type declarations, compiled by fork/build-package.mjs against
// dist/npm/types with skipLibCheck off, so a declaration that does not resolve or does not type-check fails the
// build. It only has to compile; nothing runs it.

import { browserStore, memoryStore, mountAxonometra, staticSignals } from "@axonometra/editor";
import type { HostOptions, MountOptions, PlanStore, Planner, SignalSource } from "@axonometra/editor";
import { EXAMPLE_PLANS, examplePlan } from "@axonometra/editor/plans";

// a host's own store, written against the interface
const serverStore: PlanStore = {
  async load() {
    return null;
  },
  async save(_building, _revision) {},
  async loadImage(_id) {
    return null;
  },
  async saveImage(_id, _data) {},
};

const signals = staticSignals({ "sensor.fuel": { state: "62", attributes: { unit_of_measurement: "%" } } });
signals.set("sensor.fuel", "61");
const source: SignalSource = signals;

const host: HostOptions = { store: serverStore, signals: source, language: "en", admin: true };
const options: MountOptions = { ...host, store: browserStore("my-boat"), narrow: false };

export async function mount(target: HTMLElement): Promise<Planner> {
  const name = Object.keys(EXAMPLE_PLANS)[0] ?? "family-home-two-storey";
  const store = memoryStore({ building: examplePlan(name).building });
  const planner = await mountAxonometra(target, { ...options, store });
  const element: HTMLElement = planner.element;
  element.dataset.mounted = "yes";
  return planner;
}
