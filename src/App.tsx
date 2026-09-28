import { useEffect } from 'react';
import { PageLayout } from './ui/Layout/PageLayout';
import { useFurnitureStore } from './stores/FurnitureStore';
import {
  Drawer,
  MantineProvider,
  Modal,
  Notification,
  createTheme
} from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { EmbedBridge } from './embed/EmbedBridge';

// Mantine's close buttons are icon-only and unnamed by default, so screen
// readers announced every dialog's close as a bare "button".
const theme = createTheme({
  components: {
    Modal: Modal.extend({
      defaultProps: { closeButtonProps: { 'aria-label': 'Close' } }
    }),
    Drawer: Drawer.extend({
      defaultProps: { closeButtonProps: { 'aria-label': 'Close' } }
    }),
    Notification: Notification.extend({
      defaultProps: { closeButtonProps: { 'aria-label': 'Close' } }
    })
  }
});

function App() {
  useEffect(() => {
    useFurnitureStore.getState().getCategories();
  }, []);
  return (
    <MantineProvider theme={theme}>
      <Notifications />
      <PageLayout />
      <EmbedBridge />
    </MantineProvider>
  );
}
export default App;
