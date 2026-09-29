import { jsx as _jsx } from "react/jsx-runtime";
import { IconButton, SvgIcon } from '@mui/material';
export const CloseButton = ({ onClick, label = 'Close', sx }) => (_jsx(IconButton, { "aria-label": label, size: "small", onClick: onClick, sx: sx, children: _jsx(SvgIcon, { fontSize: "small", children: _jsx("path", { d: "M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" }) }) }));
