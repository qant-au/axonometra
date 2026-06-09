import { useEffect } from 'react';
import './App.css';
import { PageLayout } from './ui/Layout/PageLayout';
import { useFurnitureStore } from './stores/FurnitureStore';
import { NotificationsProvider } from '@mantine/notifications';
import { EmbedBridge } from './embed/EmbedBridge';

function App() {
  const { getCategories } = useFurnitureStore();

  useEffect(() => {
    getCategories();
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
