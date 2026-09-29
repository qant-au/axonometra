import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Fragment, useEffect, useRef, useState } from 'react';
import { Box, ClickAwayListener, Divider, ListItemIcon, ListItemText, MenuItem, MenuList, Paper, Popper } from '@mui/material';
import { ToolButton } from './ToolButton.js';
// A toolbar button that opens a menu on hover, or on click and keyboard.
export const ToolMenu = ({ name, icon, items, placement = 'right-start', offset = 8, closeDelay = 500 }) => {
    const anchor = useRef(null);
    const [open, setOpen] = useState(false);
    // Opened from the keyboard or a click: move focus into the menu.
    const [focusItems, setFocusItems] = useState(false);
    const closeTimer = useRef(undefined);
    const cancelClose = () => clearTimeout(closeTimer.current);
    const scheduleClose = () => {
        cancelClose();
        closeTimer.current = setTimeout(() => setOpen(false), closeDelay);
    };
    const show = (focus) => {
        cancelClose();
        setFocusItems(focus);
        setOpen(true);
    };
    const close = () => {
        cancelClose();
        setOpen(false);
    };
    useEffect(() => cancelClose, []);
    return (_jsxs(_Fragment, { children: [_jsx(Box, { component: "span", ref: anchor, sx: { display: 'inline-flex' }, onMouseEnter: () => show(false), onMouseLeave: scheduleClose, children: _jsx(ToolButton, { name: name, icon: icon, hasPopup: true, expanded: open, onClick: () => (open && focusItems ? close() : show(true)) }) }), _jsx(Popper, { open: open, anchorEl: anchor.current, placement: placement, modifiers: [{ name: 'offset', options: { offset: [0, offset] } }], sx: { zIndex: (theme) => theme.zIndex.modal }, children: _jsx(ClickAwayListener, { onClickAway: (e) => {
                        // The button toggles the menu itself.
                        if (anchor.current?.contains(e.target))
                            return;
                        close();
                    }, children: _jsx(Paper, { onMouseEnter: cancelClose, onMouseLeave: scheduleClose, sx: { boxShadow: 3 }, children: _jsx(MenuList, { "aria-label": name, autoFocusItem: focusItems, onKeyDown: (e) => {
                                if (e.key === 'Escape' || e.key === 'Tab')
                                    close();
                            }, children: items.map((item, i) => (_jsxs(Fragment, { children: [item.divider && i > 0 && _jsx(Divider, {}), _jsxs(MenuItem, { onClick: () => {
                                            close();
                                            item.onClick();
                                        }, children: [item.icon && _jsx(ListItemIcon, { children: item.icon }), _jsx(ListItemText, { children: item.label })] })] }, item.label))) }) }) }) })] }));
};
