export interface KeyboardShortcutSection {
    title: string;
    rows: {
        label: string;
        keys: string[];
    }[];
}
export interface KeyboardShortcutDifference {
    excalidraw: string;
    action: string;
    here: string;
    why: string;
}
interface Props {
    open: boolean;
    onClose: () => void;
    sections: KeyboardShortcutSection[];
    differences?: readonly KeyboardShortcutDifference[];
    title?: string;
}
export declare const KeyboardShortcutsDialog: ({ open, onClose, sections, differences, title }: Props) => import("react").JSX.Element;
export {};
