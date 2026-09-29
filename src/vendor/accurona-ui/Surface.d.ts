import type { CSSProperties, ReactNode } from 'react';
import { type SxProps, type Theme } from '@mui/material';
interface Props {
    children: ReactNode;
    sx?: SxProps<Theme>;
    style?: CSSProperties;
}
export declare const Surface: ({ children, sx, style }: Props) => import("react").JSX.Element;
export {};
