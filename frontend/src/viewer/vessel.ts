// Accurona: a vessel plan's hull in the 3D view. The plates come from the vessel bundle (loaded only for a plan drawn
// in a vessel, load-vessel.ts) as plain meshes in plan coordinates; here they become three.js meshes, with their edges
// lit like the plan's walls, and a sheet of water at the waterline (y = 0) round the boat.

import { BufferGeometry, CircleGeometry, DoubleSide, EdgesGeometry, Float32BufferAttribute, Group, LineBasicMaterial, LineSegments, Mesh, MeshBasicMaterial, Uint32BufferAttribute, type Material } from "three";
import { loadVessel } from "../load-vessel.ts";
import { vesselOf } from "../vessel/spec.ts";

const WATER = 0x1d4e7a;
const EDGE = 0x37e0ff;

export class VesselLayer {
  readonly group = new Group();
  private key = "";
  private readonly redraw: () => void;

  constructor(redraw: () => void) {
    this.redraw = redraw;
  }

  /** Show the hull of the plan's vessel (nothing for a building); a changed recipe is drawn anew. */
  async set(building: unknown): Promise<void> {
    const spec = vesselOf(building);
    const key = spec ? JSON.stringify(spec) : "";
    if (key === this.key) return;
    this.key = key;
    this.clear();
    if (!spec) return this.redraw();
    const { vesselMeshes } = await loadVessel();
    if (this.key !== key) return;
    let length = 1;
    for (const m of vesselMeshes(spec)) {
      const g = new BufferGeometry();
      g.setAttribute("position", new Float32BufferAttribute(m.positions, 3));
      g.setIndex(new Uint32BufferAttribute(m.indices, 1));
      g.computeBoundingBox();
      length = Math.max(length, g.boundingBox!.max.x - g.boundingBox!.min.x);
      const mesh = new Mesh(g, new MeshBasicMaterial({ color: m.color, side: DoubleSide, transparent: true, opacity: m.see ? 0.28 : 0.75, depthWrite: !m.see }));
      this.group.add(mesh, new LineSegments(new EdgesGeometry(g, 25), new LineBasicMaterial({ color: EDGE, transparent: true, opacity: 0.55 })));
    }
    const water = new Mesh(new CircleGeometry(length * 2.5, 64), new MeshBasicMaterial({ color: WATER, transparent: true, opacity: 0.35, depthWrite: false, side: DoubleSide }));
    water.rotation.x = -Math.PI / 2;
    water.position.set(length / 2, 0, 0);
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
