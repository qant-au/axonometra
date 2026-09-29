import { useEffect } from 'react';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { PageLayout } from './ui/Layout/PageLayout';
import { useFurnitureStore } from './stores/FurnitureStore';
import { EmbedBridge } from './embed/EmbedBridge';
import { createLineworkTheme, NotificationHost } from './vendor/accurona-ui';

// Accurona's shared theme, so Axonometra looks like Reticulyne (D12).
const theme = createLineworkTheme('light');

function App() {
  useEffect(() => {
    useFurnitureStore.getState().getCategories();
  }, []);
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <NotificationHost />
      <PageLayout />
      <EmbedBridge />
    </ThemeProvider>
  );
}
export default App;
