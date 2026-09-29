import type { Scene, SceneObject, View } from './schema.js';
type ViewKind = View['kind'];
/** Per kind of view entity: fields the editor does not model, kept from the scene it opened. */
export interface PreserveFields {
    placement?: string[];
    connector?: string[];
    rectangle?: string[];
    textBox?: string[];
    group?: string[];
    floor?: string[];
    wall?: string[];
}
export interface SceneUpdate {
    /** The kinds of view this editor draws. Views of other kinds are kept. */
    viewKinds: ViewKind[];
    /** Every view of those kinds, as edited. They replace the opened ones. */
    views: View[];
    /**
     * Every object the editor has, with only the fields it edits. An object's
     * other fields are kept from the opened scene.
     */
    objects: SceneObject[];
    /** The object fields this editor edits; missing ones are cleared. */
    objectFields: (keyof SceneObject)[];
    /** View-entity fields this editor does not model, kept by id. */
    preserve?: PreserveFields;
    /** Top-level fields the editor sets (title, units, icons, colours...). */
    set?: Partial<Pick<Scene, 'title' | 'description' | 'units' | 'icons' | 'colors'>>;
}
/**
 * The scene to save: `opened` (the scene the editor loaded) with the
 * editor's part replaced by `update`.
 *
 * - Views of the editor's kinds are replaced; others are kept.
 * - An object the editor had placed and has now removed from all of its views
 *   is deleted, unless another view still places it. Objects the editor never
 *   placed (in another editor's views, or in no view at all) are kept.
 * - Connections whose objects or ports are gone are dropped, and so is a
 *   connector's `connection` that no longer exists.
 */
export declare function mergeScene(opened: Scene, update: SceneUpdate): Scene;
export {};
