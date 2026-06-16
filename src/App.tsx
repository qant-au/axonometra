import { useEffect } from 'react';
import { PageLayout } from './ui/Layout/PageLayout';
import { useFurnitureStore } from './stores/FurnitureStore';
import { NotificationsProvider } from '@mantine/notifications';
import { EmbedBridge } from './embed/EmbedBridge';

function App() {
  useEffect(() => {
    useFurnitureStore.getState().getCategories();
  }, []);
  return (
    <>
      <NotificationsProvider>
        <PageLayout />
        <EmbedBridge />
      </NotificationsProvider>
    </>
  );
}
export default App;
