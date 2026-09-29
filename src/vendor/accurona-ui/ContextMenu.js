import { jsx as _jsx } from "react/jsx-runtime";
import { Menu, MenuItem } from '@mui/material';
// The right-click menu on the drawing.
export const ContextMenu = ({ onClose, position, anchorEl, items }) => (_jsx(Menu, { open: true, anchorEl: anchorEl, style: { left: position.x, top: position.y }, onClose: onClose, children: items.map((item) => (_jsx(MenuItem, { onClick: item.onClick, children: item.label }, item.label))) }));
