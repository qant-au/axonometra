import type { Scene } from './schema.js';
export interface ReferenceIssue {
    message: string;
    path: (string | number)[];
}
export declare function checkReferences(scene: Scene): ReferenceIssue[];
