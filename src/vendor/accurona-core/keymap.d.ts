export type KeymapTool = 'axonometra' | 'reticulyne';
export type KeymapSection = 'Tools' | 'View' | 'Edit' | 'Pointer and touch';
export interface Chord {
    key?: string;
    code?: string;
    mod?: boolean;
    ctrl?: boolean;
    alt?: boolean;
    shift?: boolean | 'any';
}
export interface Binding {
    action: string;
    label: string;
    section: KeymapSection;
    chords: Chord[];
    editing: boolean;
    keysLabel?: string;
}
export interface Difference {
    excalidraw: string;
    action: string;
    here: string;
    why: string;
}
export interface KeyLike {
    key: string;
    code: string;
    ctrlKey: boolean;
    metaKey: boolean;
    altKey: boolean;
    shiftKey: boolean;
    target?: unknown;
}
export declare const SHARED_BINDINGS: readonly Binding[];
export declare const RETICULYNE_BINDINGS: readonly Binding[];
export declare const AXONOMETRA_BINDINGS: readonly Binding[];
export declare const AXONOMETRA_WALK_KEYS: readonly {
    keys: string;
    label: string;
}[];
export declare const DIFFERENCES: Record<KeymapTool, readonly Difference[]>;
export interface KeymapOptions {
    omit?: readonly string[];
}
export declare const keymapFor: (tool: KeymapTool, options?: KeymapOptions) => Binding[];
export declare const isTypingTarget: (target: unknown) => boolean;
export declare const matchChord: (event: KeyLike, chord: Chord) => boolean;
export interface ResolveOptions {
    readOnly?: boolean;
    typingGuard?: boolean;
}
export declare const resolveAction: (event: KeyLike, bindings: readonly Binding[], options?: ResolveOptions) => string | null;
export declare const formatChord: (chord: Chord, platform?: "mac" | "other") => string;
export declare const formatBinding: (binding: Binding, platform?: "mac" | "other") => string[];
export declare const shortcutHint: (bindings: readonly Binding[], action: string, platform?: "mac" | "other") => string | undefined;
export interface ShortcutRow {
    label: string;
    keys: string[];
}
export interface ShortcutSection {
    title: string;
    rows: ShortcutRow[];
}
export declare const shortcutSections: (bindings: readonly Binding[], platform?: "mac" | "other") => ShortcutSection[];
