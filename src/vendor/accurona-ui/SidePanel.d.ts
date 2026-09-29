import { type ReactNode } from 'react';
interface Props {
    open: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    width?: number;
}
export declare const SidePanel: ({ open, onClose, title, children, width }: Props) => import("react").JSX.Element;
export {};
