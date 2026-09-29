import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { AppDialog } from './AppDialog.js';
const Keys = ({ keys }) => (_jsx(Box, { component: "span", sx: { display: 'inline-flex', flexWrap: 'wrap', gap: 0.5, justifyContent: 'flex-end' }, children: keys.map((key) => (_jsx(Box, { component: "kbd", sx: {
            fontFamily: 'inherit',
            fontSize: '0.8125rem',
            px: 0.75,
            py: 0.125,
            borderRadius: 1,
            border: 1,
            borderColor: 'divider',
            bgcolor: 'action.hover',
            whiteSpace: 'nowrap'
        }, children: key }, key))) }));
// The `?` dialog: every binding a tool has, from the shared keymap, and the
// Excalidraw bindings it deliberately does not match.
export const KeyboardShortcutsDialog = ({ open, onClose, sections, differences, title = 'Keyboard shortcuts' }) => (_jsx(AppDialog, { open: open, onClose: onClose, title: title, maxWidth: "md", children: _jsxs(Stack, { spacing: 3, "data-testid": "keyboard-shortcuts", children: [_jsx(Box, { sx: { display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }, children: sections.map((section) => (_jsxs(Box, { component: "section", "aria-label": section.title, children: [_jsx(Typography, { variant: "subtitle2", component: "h3", sx: { mb: 1 }, children: section.title }), _jsx(Table, { size: "small", children: _jsx(TableBody, { children: section.rows.map((row) => (_jsxs(TableRow, { children: [_jsx(TableCell, { sx: { pl: 0 }, children: row.label }), _jsx(TableCell, { align: "right", sx: { pr: 0 }, children: _jsx(Keys, { keys: row.keys }) })] }, `${row.label}:${row.keys.join()}`))) }) })] }, section.title))) }), differences && differences.length > 0 && (_jsxs(Box, { component: "section", "aria-label": "Differences from Excalidraw", "data-testid": "excalidraw-differences", children: [_jsx(Typography, { variant: "subtitle2", component: "h3", sx: { mb: 1 }, children: "Differences from Excalidraw" }), _jsxs(Table, { size: "small", children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { sx: { pl: 0 }, children: "Excalidraw" }), _jsx(TableCell, { children: "Here" }), _jsx(TableCell, { sx: { pr: 0 }, children: "Why" })] }) }), _jsx(TableBody, { children: differences.map((d) => (_jsxs(TableRow, { children: [_jsxs(TableCell, { sx: { pl: 0 }, children: [d.excalidraw, " (", d.action, ")"] }), _jsx(TableCell, { children: d.here }), _jsx(TableCell, { sx: { pr: 0 }, children: d.why })] }, d.excalidraw + d.action))) })] })] }))] }) }));
