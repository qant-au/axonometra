// Forward migrations between scene versions (docs/scene-format.md,
// Versioning). Append-only: never edit a released one.

type Doc = Record<string, unknown>;
const isDoc = (v: unknown): v is Doc =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

export interface MigrationIssue {
  message: string;
  path: (string | number)[];
}

/**
 * Version 1 to 2 (Mounting and facing): a plan placement with a stored
 * mountMm keeps meaning a height above the floor, so it gets mountFrom
 * 'floor'. Facing is not pinned. Returns a copy, or the version 2 fields a
 * version 1 file must not hold.
 */
export function migrateV1(
  value: Doc
): { scene: Doc } | { issues: MigrationIssue[] } {
  // Copies only what it changes (no structuredClone: not every runtime that
  // reads a scene has it), so the input is never touched.
  const issues: MigrationIssue[] = [];
  const views = Array.isArray(value.views)
    ? value.views.map((view: unknown, v) => {
        if (!isDoc(view) || view.kind !== 'plan') return view;
        if (!Array.isArray(view.placements)) return view;
        const placements = view.placements.map((p: unknown, i) => {
          if (!isDoc(p)) return p;
          const at = ['views', v, 'placements', i];
          const refuse = (...key: string[]) =>
            issues.push({
              message: 'Not in scene version 1',
              path: [...at, ...key]
            });
          if ('mountFrom' in p) refuse('mountFrom');
          if ('mountOn' in p) refuse('mountOn');
          if (isDoc(p.mirror) && 'z' in p.mirror) refuse('mirror', 'z');
          return p.mountMm !== undefined ? { ...p, mountFrom: 'floor' } : p;
        });
        return { ...view, placements };
      })
    : value.views;
  if (issues.length) return { issues };
  return {
    scene: { ...value, version: 2, ...(views !== undefined ? { views } : {}) }
  };
}

/** A version 1 scene document, migrated to the current version. */
export function migrateScene(
  value: unknown
): { scene: unknown } | { issues: MigrationIssue[] } {
  if (isDoc(value) && value.version === 1) return migrateV1(value);
  return { scene: value };
}
