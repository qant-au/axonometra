import { jsx as _jsx } from "react/jsx-runtime";
import { Card } from '@mui/material';
// The card every floating toolbar and panel sits on.
export const Surface = ({ children, sx, style }) => (_jsx(Card, { sx: [
        { borderRadius: 2, boxShadow: 1, borderColor: 'grey.400' },
        ...(Array.isArray(sx) ? sx : [sx])
    ], style: style, children: children }));
