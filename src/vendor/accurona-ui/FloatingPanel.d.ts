import { type ReactNode } from 'react';
interface Props {
    open: boolean;
    onClose: () => void;
    label: string;
    children: ReactNode;
    width?: number;
}
export declare const FloatingPanel: ({ open, onClose, label, children, width }: Props) => import("react").JSX.Element | null;
export {};
