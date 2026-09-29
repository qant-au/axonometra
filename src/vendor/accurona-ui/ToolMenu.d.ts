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
    placement?: PopperPlacementType;
    offset?: number;
    closeDelay?: number;
}
export declare const ToolMenu: ({ name, icon, items, placement, offset, closeDelay }: Props) => import("react").JSX.Element;
export {};
