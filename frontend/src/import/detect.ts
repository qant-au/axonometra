// Which program a file comes from, and reading it: by its name and its first bytes.

import type { Building } from "../model.ts";
import { EXPORT_FORMAT } from "../transfer.ts";
import type { RawPlan, Warning } from "./builder.ts";
import { readDxf, type DxfLayer, type LayerRole } from "./dxf.ts";
import { isFloorplanner, readFloorplanner } from "./floorplanner.ts";
import { readGltf, readMesh, readObj, readStl, type MeshInfo, type MeshOptions } from "./mesh.ts";
import { isRoomPlan, readRoomPlan } from "./roomplan.ts";
import { readSh3d } from "./sh3d.ts";
import { isSimple, readSimple, repairPlan } from "./simple.ts";
import { isValetudo, readValetudo } from "./valetudo.ts";
import { isZip, readZip } from "./zip.ts";

export type Kind = "sh3d" | "roomplan" | "floorplanner" | "valetudo" | "dxf" | "mesh" | "simple" | "axonometra";

export interface ReadOptions {
  lang?: string;
  /** DXF: roles chosen for layers, the unit (metres per unit). */
  roles?: Record<string, LayerRole>;
  dxfUnit?: number | null;
  /** 3D models. */
  mesh?: MeshOptions;
}

export interface ReadResult {
  kind: Kind;
  /** Raw floors for the builder; null for a complete Axonometra plan. */
  raw: RawPlan | null;
  /** A complete Axonometra plan (checked and repaired). */
  building: Building | null;
  warnings: Warning[];
  layers?: DxfLayer[];
  dxfUnit?: number;
  mesh?: MeshInfo;
}

const ext = (name: string) => name.toLowerCase().split(".").pop() ?? "";

/** Reads a file; its triangles are kept between calls with other options (a 3D model is read only once). */
export async function readFile(name: string, bytes: Uint8Array, options: ReadOptions = {}, cache: { tris?: number[] } = {}): Promise<ReadResult> {
  const lang = options.lang ?? "de";
  const e = ext(name);
  if (e === "sh3d" || (isZip(bytes) && readZip(bytes).some((x) => x.name === "Home.xml"))) return { kind: "sh3d", raw: await readSh3d(bytes), building: null, warnings: [] };
  if (e === "dxf") {
    const r = readDxf(new TextDecoder("utf-8").decode(bytes), options.roles, options.dxfUnit ?? null, lang);
    return { kind: "dxf", raw: r.plan, building: null, warnings: [], layers: r.layers, dxfUnit: r.unit };
  }
  if (["glb", "gltf", "obj", "stl"].includes(e)) {
    cache.tris ??= e === "obj" ? readObj(new TextDecoder().decode(bytes)) : e === "stl" ? readStl(bytes) : readGltf(bytes);
    const r = readMesh(cache.tris, { ...options.mesh, lang });
    return { kind: "mesh", raw: r.plan, building: null, warnings: [], mesh: r.info };
  }
  let data: unknown;
  try {
    data = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new Error(e === "json" ? "not_json" : "unknown_format");
  }
  const d = data as { format?: string; building?: Building; version?: number; floors?: unknown; settings?: unknown };
  if (d?.format === EXPORT_FORMAT && d.building) {
    const r = repairPlan(d.building);
    return { kind: "axonometra", raw: null, building: r.building, warnings: r.warnings };
  }
  if (d?.version === 1 && Array.isArray(d.floors) && d.settings) {
    const r = repairPlan(d as unknown as Building);
    return { kind: "axonometra", raw: null, building: r.building, warnings: r.warnings };
  }
  if (isRoomPlan(data)) return { kind: "roomplan", raw: readRoomPlan(data, lang), building: null, warnings: [] };
  if (isValetudo(data)) return { kind: "valetudo", raw: readValetudo(data, lang), building: null, warnings: [] };
  if (isFloorplanner(data)) return { kind: "floorplanner", raw: readFloorplanner(data, lang), building: null, warnings: [] };
  if (isSimple(data)) return { kind: "simple", raw: readSimple(data), building: null, warnings: [] };
  throw new Error("unknown_format");
}
