import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useSyncExternalStore } from 'react';
import { Alert, AlertTitle, Stack } from '@mui/material';
import { dismissNotification, getNotifications, subscribeNotifications } from './notifications.js';
// Shows what notify() raises, stacked at the bottom right. Render it once,
// inside the ThemeProvider.
export const NotificationHost = () => {
    const items = useSyncExternalStore(subscribeNotifications, getNotifications, getNotifications);
    return (_jsx(Stack, { spacing: 1, sx: (theme) => ({
            position: 'fixed',
            right: 16,
            bottom: 16,
            width: 360,
            maxWidth: 'calc(100% - 32px)',
            zIndex: theme.zIndex.snackbar
        }), children: items.map((n) => (_jsxs(Alert, { severity: n.severity, variant: "outlined", icon: n.icon, onClose: () => dismissNotification(n.id), slotProps: { closeButton: { 'aria-label': 'Close' } }, sx: { bgcolor: 'background.paper', boxShadow: 3 }, children: [n.title && _jsx(AlertTitle, { children: n.title }), n.message] }, n.id))) }));
};
