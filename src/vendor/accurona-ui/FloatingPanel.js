import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
import { Paper } from '@mui/material';
import { CloseButton } from './CloseButton.js';
// A non-modal panel pinned to the top right, such as help: the drawing stays
// usable while it is open. Escape closes it.
export const FloatingPanel = ({ open, onClose, label, children, width = 440 }) => {
    useEffect(() => {
        if (!open)
            return;
        const onKey = (e) => {
            if (e.key === 'Escape')
                onClose();
        };
        // Capture phase: a focused control may stop Escape from bubbling.
        window.addEventListener('keydown', onKey, true);
        return () => window.removeEventListener('keydown', onKey, true);
    }, [open, onClose]);
    if (!open)
        return null;
    return (_jsxs(Paper, { role: "dialog", "aria-label": label, sx: (theme) => ({
            position: 'fixed',
            top: 20,
            right: 20,
            width,
            maxWidth: 'calc(100% - 40px)',
            maxHeight: 'calc(100dvh - 40px)',
            overflowY: 'auto',
            p: 2,
            pr: 5,
            borderRadius: 2,
            boxShadow: 3,
            zIndex: theme.zIndex.modal
        }), children: [_jsx(CloseButton, { onClick: onClose, sx: { position: 'absolute', top: 8, right: 8 } }), children] }));
};
