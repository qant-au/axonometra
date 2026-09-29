import { type ReactNode } from 'react';
import { type PopperPlacementType } from '@mui/material';
export interface ToolMenuItem {
    label: string;
    icon?: ReactNode;
    onClick: () => void;
    divider?: boolean;
}
interface Props {
    name: string;
    icon: ReactNode;
    items: ToolMenuItem[];
    openOnHover?: boolean;
    footer?: ReactNode;
    placement?: PopperPlacementType;
    offset?: number;
    minWidth?: number;
    closeDelay?: number;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}
export declare const ToolMenu: ({ name, icon, items, openOnHover, footer, placement, offset, minWidth, closeDelay, open: openProp, onOpenChange }: Props) => import("react").JSX.Element;
export {};
