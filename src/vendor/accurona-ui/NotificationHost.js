import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useSyncExternalStore } from 'react';
import { Alert, AlertTitle, Stack } from '@mui/material';
import { defaultNotifier } from './notifications.js';
// Shows what notify() raises, stacked at the bottom right. Render it once,
// inside the ThemeProvider. Given a notifier (createNotifier), it shows that
// one's instead.
export const NotificationHost = ({ notifier = defaultNotifier }) => {
    const items = useSyncExternalStore(notifier.subscribe, notifier.get, notifier.get);
    return (_jsx(Stack, { spacing: 1, sx: (theme) => ({
            position: 'fixed',
            right: 16,
            bottom: 16,
            width: 360,
            maxWidth: 'calc(100% - 32px)',
            zIndex: theme.zIndex.snackbar
        }), children: items.map((n) => (_jsxs(Alert, { severity: n.severity, variant: "outlined", icon: n.icon, onClose: () => notifier.dismiss(n.id), slotProps: { closeButton: { 'aria-label': 'Close' } }, sx: { bgcolor: 'background.paper', boxShadow: 3 }, children: [n.title && _jsx(AlertTitle, { children: n.title }), n.message] }, n.id))) }));
};
