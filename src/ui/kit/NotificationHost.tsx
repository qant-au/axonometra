import { useSyncExternalStore } from 'react';
import { Alert, AlertTitle, Stack } from '@mui/material';
import { defaultNotifier, type Notifier } from './notifications';

// Shows what notify() raises, stacked at the bottom right. Render it once,
// inside the ThemeProvider. Given a notifier (createNotifier), it shows that
// one's instead.
export const NotificationHost = ({
  notifier = defaultNotifier
}: {
  notifier?: Notifier;
}) => {
  const items = useSyncExternalStore(
    notifier.subscribe,
    notifier.get,
    notifier.get
  );
  return (
    <Stack
      spacing={1}
      sx={(theme) => ({
        position: 'fixed',
        right: 16,
        bottom: 16,
        width: 360,
        maxWidth: 'calc(100% - 32px)',
        zIndex: theme.zIndex.snackbar
      })}
    >
      {items.map((n) => (
        <Alert
          key={n.id}
          severity={n.severity}
          variant="outlined"
          icon={n.icon}
          onClose={() => notifier.dismiss(n.id)}
          slotProps={{ closeButton: { 'aria-label': 'Close' } }}
          sx={{ bgcolor: 'background.paper', boxShadow: 3 }}
        >
          {n.title && <AlertTitle>{n.title}</AlertTitle>}
          {n.message}
        </Alert>
      ))}
    </Stack>
  );
};
