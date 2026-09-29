import type { ReactNode } from 'react';
import { type Breakpoint } from '@mui/material';
interface Props {
    open: boolean;
    onClose: () => void;
    title?: string;
    children: ReactNode;
    actions?: ReactNode;
    fullScreen?: boolean;
    maxWidth?: Breakpoint | false;
}
export declare const AppDialog: ({ open, onClose, title, children, actions, fullScreen, maxWidth }: Props) => import("react").JSX.Element;
export {};
