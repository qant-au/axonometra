import { useEffect } from 'react';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { PageLayout } from './ui/Layout/PageLayout';
import { useFurnitureStore } from './stores/FurnitureStore';
import { EmbedBridge } from './embed/EmbedBridge';
import { createLineworkTheme, NotificationHost } from './vendor/accurona-ui';

// Accurona's shared theme, so Axonometra looks like Reticulyne (D12).
// CSS variables on: the CSS modules read --mui-* colours.
const theme = createLineworkTheme('light', { cssVariables: true });

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
