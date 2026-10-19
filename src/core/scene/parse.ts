import {
  LEGACY_SCENE_FORMAT,
  SCENE_FORMAT,
  SCENE_SCHEMA_URL,
  SCENE_VERSION,
  sceneSchema,
  type Scene
} from './schema';

// Reading and writing scene files. A scene that fails validation is refused
// whole; nothing is half-loaded.

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * JSON.parse that drops `__proto__`, `constructor` and `prototype` keys, so a
 * file cannot reach an object's prototype. Throws on invalid JSON.
 */
export function parseJson(text: string): unknown {
  return JSON.parse(text, (key, value) =>
    FORBIDDEN_KEYS.has(key) ? undefined : value
  );
}

/** Whether a parsed value claims to be a scene (it may still be invalid). */
export function isSceneDocument(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    [SCENE_FORMAT, LEGACY_SCENE_FORMAT].includes(
      (value as { format?: unknown }).format as string
    )
  );
}

export type SceneResult =
  { ok: true; scene: Scene } | { ok: false; errors: string[] };

const describe = (path: PropertyKey[], message: string) =>
  path.length ? `${path.map(String).join('.')}: ${message}` : message;

/**
 * Validates an already-parsed value as a scene. An older version is migrated
 * forward (by sceneSchema), so the result is always the current version.
 */
export function validateScene(value: unknown): SceneResult {
  if (isSceneDocument(value)) {
    const version = (value as { version?: unknown }).version;
    if (typeof version === 'number' && version > SCENE_VERSION) {
      return {
        ok: false,
        errors: [
          `Scene version ${version} is newer than this editor reads (${SCENE_VERSION}).`
        ]
      };
    }
  }
  const result = sceneSchema.safeParse(value);
  if (result.success) return { ok: true, scene: result.data };
  return {
    ok: false,
    errors: result.error.issues.map((i) => describe(i.path, i.message))
  };
}

/** Parses and validates scene file text. */
export function parseScene(text: string): SceneResult {
  let value: unknown;
  try {
    value = parseJson(text);
  } catch {
    return { ok: false, errors: ['The file is not valid JSON.'] };
  }
  return validateScene(value);
}

/**
 * The text of a scene file: validated, with `$schema` set, keys in the
 * documented order. Throws if the scene is invalid, since an editor that
 * writes an invalid scene has a bug, and saving it would lose work later.
 */
export function serializeScene(scene: Scene): string {
  const { $schema: _schema, format, version, id, ...rest } = scene;
  const ordered = { $schema: SCENE_SCHEMA_URL, format, version, id, ...rest };
  const result = validateScene(ordered);
  if (!result.ok) {
    throw new Error(`Refusing to write an invalid scene: ${result.errors[0]}`);
  }
  return JSON.stringify(ordered, null, 2) + '\n';
}

/** The smallest valid scene, for a new drawing. */
export function emptyScene(id: string, title?: string): Scene {
  return {
    format: SCENE_FORMAT,
    version: SCENE_VERSION,
    id,
    ...(title !== undefined ? { title } : {}),
    objects: []
  };
}
