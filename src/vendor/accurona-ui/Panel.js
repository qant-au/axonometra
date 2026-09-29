import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Divider, Stack, Typography } from '@mui/material';
// The inside of a properties panel: an optional header that stays put while
// the sections under it scroll.
export const Panel = ({ header, children }) => (_jsxs(Box, { sx: {
        position: 'relative',
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        pb: 2
    }, children: [header && (_jsxs(Box, { sx: {
                width: '100%',
                zIndex: 1,
                position: 'sticky',
                bgcolor: 'background.paper',
                top: 0
            }, children: [header, _jsx(Divider, {})] })), _jsx(Box, { sx: { width: '100%', flexGrow: 1 }, children: _jsx(Box, { sx: { width: '100%' }, children: children }) })] }));
// A group of controls, with an optional small uppercase title.
export const PanelSection = ({ children, title, sx }) => (_jsx(Box, { sx: [{ pt: 3, px: 3 }, ...(Array.isArray(sx) ? sx : [sx])], children: _jsxs(Stack, { children: [title && (_jsx(Typography, { variant: "body2", sx: { color: 'text.secondary', textTransform: 'uppercase', pb: 1 }, children: title })), children] }) }));
// The line at the top of a panel naming what is being edited.
export const PanelHeader = ({ title }) => (_jsx(PanelSection, { sx: { py: 3 }, children: _jsx(Typography, { variant: "body2", sx: { color: 'text.secondary' }, children: title }) }));
