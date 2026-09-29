import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Fragment, useEffect, useRef, useState } from 'react';
import { Box, ClickAwayListener, Divider, ListItemIcon, ListItemText, MenuItem, MenuList, Paper, Popper } from '@mui/material';
import { ToolButton } from './ToolButton.js';
// A toolbar button that opens a menu. The menu is not modal: a click outside
// closes it and still reaches whatever was clicked.
export const ToolMenu = ({ name, icon, items, openOnHover = true, footer, placement = 'right-start', offset = 8, minWidth, closeDelay = 500, open: openProp, onOpenChange }) => {
    const anchor = useRef(null);
    const [ownOpen, setOwnOpen] = useState(false);
    const open = openProp ?? ownOpen;
    const setOpen = (next) => {
        if (openProp === undefined)
            setOwnOpen(next);
        onOpenChange?.(next);
    };
    // Opened from the keyboard or a click: move focus into the menu.
    const [focusItems, setFocusItems] = useState(false);
    const closeTimer = useRef(undefined);
    const cancelClose = () => clearTimeout(closeTimer.current);
    const scheduleClose = () => {
        if (!openOnHover)
            return;
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
    // Closed from the keyboard: focus goes back to the button.
    const closeToButton = () => {
        close();
        anchor.current?.querySelector('button')?.focus();
    };
    useEffect(() => cancelClose, []);
    const hover = openOnHover
        ? { onMouseEnter: () => show(false), onMouseLeave: scheduleClose }
        : {};
    return (_jsxs(_Fragment, { children: [_jsx(Box, { component: "span", ref: anchor, sx: { display: 'inline-flex' }, ...hover, children: _jsx(ToolButton, { name: name, icon: icon, hasPopup: true, expanded: open, onClick: () => open && (focusItems || !openOnHover) ? close() : show(true) }) }), _jsx(Popper, { open: open, anchorEl: anchor.current, placement: placement, modifiers: [{ name: 'offset', options: { offset: [0, offset] } }], sx: { zIndex: (theme) => theme.zIndex.modal }, children: _jsx(ClickAwayListener, { onClickAway: (e) => {
                        // The button toggles the menu itself.
                        if (anchor.current?.contains(e.target))
                            return;
                        close();
                    }, children: _jsxs(Paper, { onMouseEnter: cancelClose, onMouseLeave: scheduleClose, sx: { boxShadow: 3, minWidth }, children: [_jsx(MenuList, { "aria-label": name, autoFocusItem: focusItems, onKeyDown: (e) => {
                                    if (e.key === 'Escape') {
                                        e.stopPropagation();
                                        closeToButton();
                                    }
                                    else if (e.key === 'Tab')
                                        close();
                                }, children: items.map((item, i) => (_jsxs(Fragment, { children: [item.divider && i > 0 && _jsx(Divider, {}), _jsxs(MenuItem, { onClick: () => {
                                                close();
                                                item.onClick();
                                            }, children: [item.icon && _jsx(ListItemIcon, { children: item.icon }), _jsx(ListItemText, { children: item.label })] })] }, item.label))) }), footer && (_jsxs(_Fragment, { children: [_jsx(Divider, {}), _jsx(Box, { sx: { px: 2, py: 1 }, children: footer })] }))] }) }) })] }));
};
