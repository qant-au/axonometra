// Axonometra: plan stores for hosts without a server. memoryStore() keeps everything for the session (tests, demos);
// browserStore() keeps it in the browser's IndexedDB, one database per plan name.

import type { Building } from "../model.ts";
import type { PlanStore } from "./types.ts";

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

/** A plan kept in this browser (IndexedDB database `axonometra:<name>`). */
export function browserStore(name = "default"): PlanStore {
  let db: Promise<IDBDatabase> | undefined;
  const open = () =>
    (db ??= new Promise((resolve, reject) => {
      const req = indexedDB.open(`axonometra:${name}`, 1);
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
