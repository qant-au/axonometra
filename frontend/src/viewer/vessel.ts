// Axonometra: a vessel plan's hull in the 3D view. The plates come from the vessel bundle (loaded only for a plan drawn
// in a vessel, load-vessel.ts) as plain meshes in plan coordinates; here they become three.js meshes, with their edges
// lit like the plan's walls, and a sheet of water round the boat where her load puts it: as she trims and heels with
// what she carries, the water lies across her accordingly.

import { BufferGeometry, CircleGeometry, DoubleSide, EdgesGeometry, Float32BufferAttribute, Group, LineBasicMaterial, LineSegments, Mesh, MeshBasicMaterial, Quaternion, Uint32BufferAttribute, Vector3, type Material } from "three";
import { loadVessel } from "../load-vessel.ts";
import { massOn } from "../vessel/mass.ts";
import { vesselOf, type Weighted } from "../vessel/spec.ts";

const WATER = 0x1d4e7a;
const EDGE = 0x37e0ff;

export class VesselLayer {
  readonly group = new Group();
  private key = "";
  private readonly redraw: () => void;

  constructor(redraw: () => void) {
    this.redraw = redraw;
  }

  /** Show the hull of the plan's vessel (nothing for a building); a changed recipe or a moved weight is drawn anew. */
  async set(building: unknown): Promise<void> {
    const spec = vesselOf(building);
    // with masses on, every item on the decks counts (its default mass when none is entered), so any of them can move her
    const floors = (building as { floors?: { elevation: number; furniture: (Weighted & { type: string; x: number; z: number; w: number; d: number; h: number; mount_y?: number | null })[] }[] }).floors ?? [];
    const mass = massOn(building);
    const weighted = mass ? floors.flatMap((f) => f.furniture.map((i) => [f.elevation, i.type, i.x, i.z, i.w, i.d, i.h, i.mount_y ?? 0, i.component?.mass ?? null])) : [];
    const key = spec ? JSON.stringify([spec, mass, weighted]) : "";
    if (key === this.key) return;
    this.key = key;
    this.clear();
    if (!spec) return this.redraw();
    const { vesselScene } = await loadVessel();
    if (this.key !== key) return;
    const scene = vesselScene(building, spec);
    let length = 1;
    for (const m of scene.meshes) {
      const g = new BufferGeometry();
      g.setAttribute("position", new Float32BufferAttribute(m.positions, 3));
      g.setIndex(new Uint32BufferAttribute(m.indices, 1));
      g.computeBoundingBox();
      length = Math.max(length, g.boundingBox!.max.x - g.boundingBox!.min.x);
      const mesh = new Mesh(g, new MeshBasicMaterial({ color: m.color, side: DoubleSide, transparent: true, opacity: m.see ? 0.28 : 0.75, depthWrite: !m.see }));
      this.group.add(mesh, new LineSegments(new EdgesGeometry(g, 25), new LineBasicMaterial({ color: EDGE, transparent: true, opacity: 0.55 })));
    }
    const water = new Mesh(new CircleGeometry(length * 1.4, 64), new MeshBasicMaterial({ color: WATER, transparent: true, opacity: 0.35, depthWrite: false, side: DoubleSide }));
    // the circle lies across its own z: turned so that z is the water's up
    const up = scene.water?.up ?? [0, 1, 0];
    water.quaternion.copy(new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), new Vector3(...up)));
    water.position.set(...(scene.water?.point ?? [length / 2, 0, 0]));
    water.renderOrder = 2;
    this.group.add(water);
    this.redraw();
  }

  private clear(): void {
    for (const o of [...this.group.children]) {
      this.group.remove(o);
      (o as Mesh).geometry?.dispose();
      ((o as Mesh).material as Material | undefined)?.dispose();
    }
  }

  dispose(): void {
    this.key = "";
    this.clear();
  }
}
