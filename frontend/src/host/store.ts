// Axonometra: plan stores for hosts without a server. memoryStore() keeps everything for the session (tests, demos);
// browserStore() keeps it in the browser's IndexedDB, one database per plan name.

import type { Building } from "../model.ts";
import type { PlanStore, SavedPlan, SavedPlans } from "./types.ts";

export function memoryStore(initial?: { building: Building; revision?: number }): PlanStore {
  let plan = initial ? { building: structuredClone(initial.building), revision: initial.revision ?? 1 } : null;
  const images = new Map<string, string>();
  return {
    async load() {
      return plan ? { building: structuredClone(plan.building), revision: plan.revision } : null;
    },
    async save(building, revision) {
      plan = { building: structuredClone(building), revision };
    },
    async loadImage(id) {
      return images.get(id) ?? null;
    },
    async saveImage(id, data) {
      images.set(id, data);
    },
  };
}

const PLAN = "plan";
const IMAGES = "images";

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

const DATABASE = "axonometra:";

/** A plan kept in this browser (IndexedDB database `axonometra:<name>`). */
export function browserStore(name = "default"): PlanStore {
  let db: Promise<IDBDatabase> | undefined;
  const open = () =>
    (db ??= new Promise((resolve, reject) => {
      const req = indexedDB.open(`${DATABASE}${name}`, 1);
      req.onupgradeneeded = () => {
        req.result.createObjectStore(PLAN);
        req.result.createObjectStore(IMAGES);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    }));
  const tx = async (store: string, mode: IDBTransactionMode) => (await open()).transaction(store, mode).objectStore(store);
  return {
    async load() {
      const plan = await request((await tx(PLAN, "readonly")).get("current"));
      return (plan as { building: Building; revision: number } | undefined) ?? null;
    },
    async save(building, revision) {
      await request((await tx(PLAN, "readwrite")).put({ building, revision }, "current"));
    },
    async loadImage(id) {
      return ((await request((await tx(IMAGES, "readonly")).get(id))) as string | undefined) ?? null;
    },
    async saveImage(id, data) {
      await request((await tx(IMAGES, "readwrite")).put(data, id));
    },
  };
}

/**
 * Every plan kept in this browser, for a page that is the planner on its own. `store` is the plan being worked on:
 * the one named `current`, or with no name a new plan, which is named (after the boat, else "Plan") and kept at its
 * first save. `plans` lists the others for the start page and opens one, which then becomes the plan worked on.
 * `onCurrent` hears the name each time it changes, for the page to keep in its address.
 */
export function browserPlans(current: string | null = null, onCurrent?: (name: string) => void): { store: PlanStore; plans: SavedPlans } {
  let store = current === null ? null : browserStore(current);
  // a browser that cannot list its databases (Firefox before 126) offers none
  const names = async () =>
    ((await indexedDB.databases?.()) ?? []).flatMap((d) => (d.name?.startsWith(DATABASE) ? [d.name.slice(DATABASE.length)] : []));
  const use = (name: string): PlanStore => {
    current = name;
    onCurrent?.(name);
    return (store = browserStore(name));
  };
  // one naming, however many saves wait for it
  let naming: Promise<PlanStore> | undefined;
  const named = (building?: Building): Promise<PlanStore> =>
    store
      ? Promise.resolve(store)
      : (naming ??= names().then((taken) => {
          const base = (building as { vessel?: { name?: string } } | undefined)?.vessel?.name?.trim() || "Plan";
          let name = base;
          for (let i = 2; taken.includes(name); i++) name = `${base} ${i}`;
          return use(name);
        }));
  return {
    store: {
      load: async () => (store ? store.load() : null),
      save: async (building, revision) => (await named(building)).save(building, revision),
      loadImage: async (id) => (store ? store.loadImage(id) : null),
      saveImage: async (id, data) => (await named()).saveImage(id, data),
    },
    plans: {
      async list() {
        const out: SavedPlan[] = [];
        // a plan with nothing drawn in it is not worth offering
        for (const name of (await names()).sort((a, b) => a.localeCompare(b))) if ((await browserStore(name).load())?.building.floors.length) out.push({ id: name, name });
        return out;
      },
      async open(id) {
        const plan = await browserStore(id).load();
        if (!plan) throw new Error(`No saved plan "${id}"`);
        use(id);
        return plan.building;
      },
    },
  };
}
