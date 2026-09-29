import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { CloseButton } from './CloseButton.js';
// A modal dialog with a titled header and a named close button. Full screen,
// the content fills the space under the header as a column.
export const AppDialog = ({ open, onClose, title, children, actions, fullScreen = false, maxWidth = 'xs' }) => (_jsxs(Dialog, { open: open, onClose: onClose, fullScreen: fullScreen, fullWidth: !fullScreen, maxWidth: maxWidth, children: [title && (_jsxs(Box, { sx: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                pr: 2
            }, children: [_jsx(DialogTitle, { children: title }), _jsx(CloseButton, { onClick: onClose })] })), _jsx(DialogContent, { sx: fullScreen
                ? {
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    minHeight: 0
                }
                : title
                    ? undefined
                    : { pt: 3 }, children: children }), actions && _jsx(DialogActions, { children: actions })] }));
