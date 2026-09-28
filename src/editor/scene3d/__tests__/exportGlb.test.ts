import { describe, expect, it } from 'vitest';
import { exportGlb } from '../exportGlb';

// A 400 × 300 room with a queen bed in it.
const plan = JSON.stringify({
  version: 2,
  furnitureId: 2,
  wallNodeId: 5,
  floors: [
    {
      wallNodes: [
        { id: 1, x: 0, y: 0 },
        { id: 2, x: 400, y: 0 },
        { id: 3, x: 400, y: 300 },
        { id: 4, x: 0, y: 300 }
      ],
      wallNodeLinks: [
        [1, [2]],
        [2, [3]],
        [3, [4]],
        [4, [1]]
      ],
      furnitureArray: [
        {
          id: 1,
          texturePath: 'bed-queen',
          width: 1.53,
          height: 2.03,
          rotation: 0,
          x: 100,
          y: 50,
          orientation: 0,
          zIndex: 1
        }
      ]
    }
  ]
});

// A .glb is a 12-byte header ("glTF", version 2, length), then a JSON chunk.
function readGlb(buffer: ArrayBuffer) {
  const view = new DataView(buffer);
  const magic = new TextDecoder().decode(new Uint8Array(buffer, 0, 4));
  const jsonLength = view.getUint32(12, true);
  const json = JSON.parse(
    new TextDecoder().decode(new Uint8Array(buffer, 20, jsonLength))
  );
  return {
    magic,
    version: view.getUint32(4, true),
    length: view.getUint32(8, true),
    json
  };
}

describe('exportGlb', () => {
  it('writes a glTF 2 binary with the walls, room and furniture as meshes', async () => {
    const buffer = await exportGlb(plan);
    const glb = readGlb(buffer);
    expect(glb.magic).toBe('glTF');
    expect(glb.version).toBe(2);
    expect(glb.length).toBe(buffer.byteLength);
    const names = glb.json.nodes.map((n: { name?: string }) => n.name);
    expect(names).toContain('Axonometra plan');
    expect(names).toEqual(
      expect.arrayContaining(['wall', 'floor', 'ceiling', 'furniture'])
    );
    // No drawn outlines in an exported model.
    expect(names.some((n: string) => n?.endsWith('-edges'))).toBe(false);
  });

  it('scales the plan to metres', async () => {
    const glb = readGlb(await exportGlb(plan));
    const root = glb.json.nodes.find(
      (n: { name?: string }) => n.name === 'Axonometra plan'
    );
    // Written as a matrix: the diagonal is the scale.
    const m: number[] = root.matrix;
    expect([m[0], m[5], m[10]]).toEqual([0.01, 0.01, 0.01]);
  });
});
