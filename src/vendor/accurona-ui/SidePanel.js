import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useId } from 'react';
import { Box, Drawer, Typography } from '@mui/material';
import { CloseButton } from './CloseButton.js';
// A panel that slides in from the right: a library to pick from, a list of
// settings. Escape or a click on the canvas closes it.
export const SidePanel = ({ open, onClose, title, children, width = 440 }) => {
    const titleId = useId();
    return (_jsxs(Drawer, { anchor: "right", open: open, onClose: onClose, slotProps: {
            backdrop: { invisible: true },
            paper: {
                role: 'dialog',
                'aria-labelledby': titleId,
                sx: {
                    width,
                    maxWidth: '100%',
                    display: 'flex',
                    flexDirection: 'column'
                }
            }
        }, children: [_jsxs(Box, { sx: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    px: 3,
                    py: 2
                }, children: [_jsx(Typography, { id: titleId, variant: "h6", component: "h2", children: title }), _jsx(CloseButton, { onClick: onClose })] }), _jsx(Box, { sx: { flex: 1, minHeight: 0, overflowY: 'auto', px: 3, pb: 3 }, children: children })] }));
};
