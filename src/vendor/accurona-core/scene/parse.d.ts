import { type Scene } from './schema.js';
/**
 * JSON.parse that drops `__proto__`, `constructor` and `prototype` keys, so a
 * file cannot reach an object's prototype. Throws on invalid JSON.
 */
export declare function parseJson(text: string): unknown;
/** Whether a parsed value claims to be a scene (it may still be invalid). */
export declare function isSceneDocument(value: unknown): boolean;
export type SceneResult = {
    ok: true;
    scene: Scene;
} | {
    ok: false;
    errors: string[];
};
/** Validates an already-parsed value as a scene. */
export declare function validateScene(value: unknown): SceneResult;
/** Parses and validates scene file text. */
export declare function parseScene(text: string): SceneResult;
/**
 * The text of a scene file: validated, with `$schema` set, keys in the
 * documented order. Throws if the scene is invalid, since an editor that
 * writes an invalid scene has a bug, and saving it would lose work later.
 */
export declare function serializeScene(scene: Scene): string;
/** The smallest valid scene, for a new drawing. */
export declare function emptyScene(id: string, title?: string): Scene;
