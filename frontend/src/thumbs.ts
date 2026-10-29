// Small pictures of furniture for the library's cards, drawn once by the 3D bundle and kept in the browser
// (IndexedDB, per item and pack release): the second opening of the library shows them at once. Everything
// here fails soft – without storage the pictures are just drawn again.

const DB = "axonometra-thumbs";
const STORE = "thumbs";
const memory = new Map<string, string>();
let dbPromise: Promise<IDBDatabase | null> | null = null;

function open(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") return resolve(null);
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

async function read(key: string): Promise<string | null> {
  const db = await open();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const req = db.transaction(STORE, "readonly").objectStore(STORE).get(key);
      req.onsuccess = () => resolve(typeof req.result === "string" ? req.result : null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function write(key: string, url: string): Promise<void> {
  const db = await open();
  if (!db) return;
  try {
    db.transaction(STORE, "readwrite").objectStore(STORE).put(url, key);
  } catch {
    // storage full or blocked: the picture lives in memory for this page
  }
}

/** The picture for a key: from memory, from the browser's store, or drawn now and kept. */
export async function thumbFor(key: string, draw: () => Promise<string | null>): Promise<string | null> {
  const hit = memory.get(key);
  if (hit) return hit;
  const stored = await read(key);
  if (stored) {
    memory.set(key, stored);
    return stored;
  }
  const url = await draw();
  if (url) {
    memory.set(key, url);
    void write(key, url);
  }
  return url;
}

/** Forgets every stored picture (after a pack update the keys change anyway; this is for the settings' reset). */
export async function clearThumbs(): Promise<void> {
  memory.clear();
  const db = await open();
  if (!db) return;
  try {
    db.transaction(STORE, "readwrite").objectStore(STORE).clear();
  } catch {
    // nothing to clear
  }
}
