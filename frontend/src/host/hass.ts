// Accurona: the engine without Home Assistant. createHass() answers the engine's calls from a host's store and
// signal source, in the shape the engine already speaks (upstream's HomeAssistant interface in types.ts), so the
// engine runs unchanged. Calls that only Home Assistant can answer (Assist, the recorder, the energy dashboard)
// are refused with Home Assistant's own error shape; the engine treats those features as absent.

import { emptyBuilding, type Building } from "../model.ts";
import type { HostMark } from "../homeassistant.ts";
import type { HassEntity, HomeAssistant } from "../types.ts";
import type { HostOptions } from "./types.ts";

/** Home Assistant's error shape for a command it does not know. */
function unsupported(type: unknown): { code: string; message: string } {
  return { code: "not_supported", message: `${String(type)} is not available in this host` };
}

export interface HassHandle {
  /** The current object. A new one is made on every change, as Home Assistant does, so Lit re-renders. */
  readonly hass: HomeAssistant;
  /** Called with each new object. */
  onChange(listener: (hass: HomeAssistant) => void): () => void;
  /** Stops following the signal source. */
  dispose(): void;
}

export async function createHass(options: HostOptions): Promise<HassHandle> {
  const { store, signals } = options;
  const saved = await store.load();
  let building: Building = saved?.building ?? emptyBuilding();
  let revision = saved?.revision ?? 0;
  const planListeners = new Set<(msg: { revision: number }) => void>();
  const changeListeners = new Set<(hass: HomeAssistant) => void>();
  // restore points live for the session only; a persistent history is the store's to add later
  const snapshots: { id: string; revision: number; saved_at: number; building: Building }[] = [];

  async function callWS(msg: Record<string, unknown>): Promise<unknown> {
    switch (msg.type) {
      case "accurona/building/get":
        return { building: structuredClone(building), revision };
      case "accurona/building/save":
        building = structuredClone(msg.building as Building);
        revision += 1;
        await store.save(building, revision);
        for (const cb of planListeners) cb({ revision });
        return { revision };
      case "accurona/image/get": {
        const data = await store.loadImage(String(msg.image_id));
        if (data === null) throw { code: "not_found", message: "Image not found" };
        return { data };
      }
      case "accurona/image/set":
        await store.saveImage(String(msg.image_id), String(msg.data));
        return null;
      case "accurona/history/list":
        return {
          snapshots: snapshots.map(({ building: b, ...rest }) => ({
            ...rest,
            floors: b.floors.length,
            rooms: b.floors.reduce((n, f) => n + f.rooms.length, 0),
          })),
        };
      case "accurona/history/snapshot":
        snapshots.push({ id: `s${snapshots.length + 1}`, revision, saved_at: Date.now() / 1000, building: structuredClone(building) });
        return null;
      case "accurona/history/restore": {
        const snap = snapshots.find((s) => s.id === msg.snapshot_id);
        if (!snap) throw { code: "not_found", message: "Restore point not found" };
        return callWS({ type: "accurona/building/save", building: snap.building });
      }
      // furniture packs: none installed in this host yet (importing them is a later step)
      case "accurona/packs/list":
        return { packs: [] };
      // the upstream author's shop is not connected (upstream.ts); the engine reads this as "no key"
      case "accurona/license/get":
        return { instance: "", active: false, key_hint: null, licensee: null, checked_at: null, error: null, shop_url: "", packs: [] };
      case "accurona/diagnostics/client":
        return { enabled: false };
      default:
        throw unsupported(msg.type);
    }
  }

  const connection: HomeAssistant["connection"] = {
    async subscribeMessage<T>(callback: (msg: T) => void, msg: Record<string, unknown>) {
      if (msg.type === "accurona/building/subscribe") {
        const cb = callback as unknown as (m: { revision: number }) => void;
        planListeners.add(cb);
        return async () => void planListeners.delete(cb);
      }
      // Assist's sentences and the like: nothing is ever sent
      return async () => undefined;
    },
  };

  const { location } = options;
  function make(states: Record<string, HassEntity>): HomeAssistant & HostMark {
    return {
      // the Home Assistant-only parts of the planner stay hidden unless the embedder says it is there (homeassistant.ts)
      accurona: { homeAssistant: options.homeAssistant ?? false },
      language: options.language ?? (typeof navigator === "undefined" ? "en" : navigator.language),
      user: { is_admin: options.admin ?? true, name: "" },
      areas: {},
      floors: {},
      entities: {},
      devices: {},
      states,
      config: location
        ? { latitude: location.latitude, longitude: location.longitude, time_zone: location.timeZone }
        : {},
      connection,
      callWS: callWS as HomeAssistant["callWS"],
      async callService(domain: string, service: string, data?: Record<string, unknown>) {
        if (!signals?.act) throw unsupported(`${domain}.${service}`);
        await signals.act(domain, service, data ?? {});
        return null;
      },
    };
  }

  let current = make(signals?.states() ?? {});
  const unsubscribe = signals?.subscribe(() => {
    current = make(signals.states());
    for (const cb of changeListeners) cb(current);
  });

  return {
    get hass() {
      return current;
    },
    onChange(listener) {
      changeListeners.add(listener);
      return () => void changeListeners.delete(listener);
    },
    dispose() {
      unsubscribe?.();
      changeListeners.clear();
    },
  };
}
