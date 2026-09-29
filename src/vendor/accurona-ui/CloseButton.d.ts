import { type SxProps, type Theme } from '@mui/material';
interface Props {
    onClick: () => void;
    label?: string;
    sx?: SxProps<Theme>;
}
export declare const CloseButton: ({ onClick, label, sx }: Props) => import("react").JSX.Element;
export {};
