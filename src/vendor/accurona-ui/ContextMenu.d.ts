export interface ContextMenuItem {
    label: string;
    onClick: () => void;
}
interface Props {
    onClose: () => void;
    position: {
        x: number;
        y: number;
    };
    anchorEl?: HTMLElement;
    items: ContextMenuItem[];
}
export declare const ContextMenu: ({ onClose, position, anchorEl, items }: Props) => import("react").JSX.Element;
export {};
