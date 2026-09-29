import type { ReactNode } from 'react';
import { type SxProps, type Theme } from '@mui/material';
export declare const Panel: ({ header, children }: {
    header?: ReactNode;
    children: ReactNode;
}) => import("react").JSX.Element;
export declare const PanelSection: ({ children, title, sx }: {
    children: ReactNode;
    title?: string;
    sx?: SxProps<Theme>;
}) => import("react").JSX.Element;
export declare const PanelHeader: ({ title }: {
    title: string;
}) => import("react").JSX.Element;
