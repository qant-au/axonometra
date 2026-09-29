import type { MouseEvent, ReactNode } from 'react';
import { type TooltipProps } from '@mui/material';
export interface ToolButtonProps {
    name: string;
    icon: ReactNode;
    onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
    isActive?: boolean;
    disabled?: boolean;
    tooltipPosition?: TooltipProps['placement'];
    hasPopup?: boolean;
    expanded?: boolean;
}
export declare const ToolButton: ({ name, icon, onClick, isActive, disabled, tooltipPosition, hasPopup, expanded }: ToolButtonProps) => import("react").JSX.Element;
