import { useEffect } from 'react';
import { PageLayout } from './ui/Layout/PageLayout';
import { useFurnitureStore } from './stores/FurnitureStore';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { EmbedBridge } from './embed/EmbedBridge';

function App() {
  useEffect(() => {
    useFurnitureStore.getState().getCategories();
  }, []);
  return (
    <MantineProvider>
      <Notifications />
      <PageLayout />
      <EmbedBridge />
    </MantineProvider>
  );
}
export default App;
