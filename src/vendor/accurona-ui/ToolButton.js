import { jsx as _jsx } from "react/jsx-runtime";
import { Box, Button, Tooltip } from '@mui/material';
// A square icon button with a tooltip: one tool on a toolbar.
export const ToolButton = ({ name, icon, onClick, isActive, disabled = false, tooltipPosition = 'bottom', hasPopup, expanded }) => {
    // Palette roles rather than fixed greys, so both light and dark read.
    const iconColor = isActive
        ? 'primary.contrastText'
        : disabled
            ? 'action.disabled'
            : 'text.secondary';
    return (_jsx(Tooltip, { title: name, placement: tooltipPosition, enterDelay: 1000, enterNextDelay: 1000, arrow: true, 
        // The button carries its own aria-label; this stops the tooltip from
        // naming the wrapper too.
        describeChild: true, children: _jsx(Box, { component: "span", sx: { display: 'inline-flex' }, children: _jsx(Button, { variant: "text", onClick: onClick, disabled: disabled, "aria-label": name, ...(isActive !== undefined ? { 'aria-pressed': isActive } : {}), ...(hasPopup
                    ? { 'aria-haspopup': 'menu', 'aria-expanded': !!expanded }
                    : {}), sx: (theme) => ({
                    borderRadius: 0,
                    height: theme.customVars.toolMenu.height,
                    width: theme.customVars.toolMenu.height,
                    maxWidth: '100%',
                    minWidth: 'auto',
                    p: 0,
                    m: 0,
                    // primary.main: white on primary.light was 2.6:1.
                    bgcolor: isActive ? 'primary.main' : undefined,
                    '&:focus-visible': {
                        outline: `2px solid ${theme.palette.primary.main}`,
                        outlineOffset: 2
                    }
                }), children: _jsx(Box, { sx: {
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        color: iconColor,
                        svg: { color: iconColor }
                    }, children: icon }) }) }) }));
};
