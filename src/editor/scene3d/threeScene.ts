// Turns the scene model's prisms into three.js meshes. Plan units (cm) are
// kept; the plan's x stays x, height becomes y (three's up), and the plan's y
// becomes z, so looking down from above reads the same way round as the plan.
import {
  BufferGeometry,
  EdgesGeometry,
  ExtrudeGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  Shape,
  Vector2
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Prism, PrismKind } from './geometry';

const COLOURS: Record<PrismKind, string> = {
  wall: '#f4f1ec',
  sill: '#f4f1ec',
  lintel: '#f4f1ec',
  ceiling: '#f4f1ec',
  floor: '#d9d3c7',
  furniture: '#b8c4cf'
};
const EDGE_COLOUR = '#5f5a50';
/** Only edges sharper than this are outlined, so curved extrusions stay clean. */
const EDGE_ANGLE = 20;
/** How strongly an outline above the cut-away shows: faces, then edges. */
const GHOST_FACE = 0.08;
const GHOST_EDGE = 0.35;

function prismGeometry(p: Prism): BufferGeometry {
  const shape = new Shape(p.footprint.map((q) => new Vector2(q.x, -q.y)));
  const geometry = new ExtrudeGeometry(shape, {
    depth: Math.max(p.z1 - p.z0, 0.01),
    bevelEnabled: false
  });
  // Shape plane (x, -planY) extruded along +z  →  (x, height, planY).
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, p.z0, 0);
  return geometry;
}

export interface BuiltScene {
  group: Group;
  dispose: () => void;
}

/** One merged mesh and one outline per kind, so a floor costs a few draw calls. */
export function buildGroup(
  prisms: Prism[],
  { edges = true }: { edges?: boolean } = {}
): BuiltScene {
  const group = new Group();
  const owned: { dispose: () => void }[] = [];
  // Grouped by kind and colour: each group is one merged mesh.
  const byKind = new Map<
    string,
    { kind: PrismKind; colour: string; ghost: boolean; parts: BufferGeometry[] }
  >();
  for (const p of prisms) {
    if (p.footprint.length < 3) continue;
    const colour = p.colour ?? COLOURS[p.kind];
    const ghost = !!p.ghost;
    const key = `${p.kind} ${colour}${ghost ? ' above' : ''}`;
    const group = byKind.get(key) ?? { kind: p.kind, colour, ghost, parts: [] };
    group.parts.push(prismGeometry(p));
    byKind.set(key, group);
  }
  const edgeMaterial = new LineBasicMaterial({ color: EDGE_COLOUR });
  // Above the cut-away: see-through faces and faint edges, so the item
  // shows where it hangs without hiding the room under it.
  const ghostEdgeMaterial = new LineBasicMaterial({
    color: EDGE_COLOUR,
    transparent: true,
    opacity: GHOST_EDGE,
    depthWrite: false
  });
  owned.push(edgeMaterial, ghostEdgeMaterial);
  for (const { kind, colour, ghost, parts } of byKind.values()) {
    const merged = mergeGeometries(parts);
    for (const part of parts) part.dispose();
    if (!merged) continue;
    const material = new MeshStandardMaterial({
      color: colour,
      roughness: 0.9,
      metalness: 0,
      // Push faces back a touch so the outlines draw over them cleanly.
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
      ...(ghost
        ? { transparent: true, opacity: GHOST_FACE, depthWrite: false }
        : {})
    });
    const mesh = new Mesh(merged, material);
    mesh.name = ghost ? `${kind}-above` : kind;
    group.add(mesh);
    owned.push(merged, material);
    // The drawn outlines are for the screen; an exported model leaves them out.
    if (edges) {
      const outline = new EdgesGeometry(merged, EDGE_ANGLE);
      const lines = new LineSegments(
        outline,
        ghost ? ghostEdgeMaterial : edgeMaterial
      );
      lines.name = `${mesh.name}-edges`;
      group.add(lines);
      owned.push(outline);
    }
  }
  return {
    group,
    dispose: () => {
      for (const o of owned) o.dispose();
    }
  };
}
