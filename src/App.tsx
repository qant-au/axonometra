import { useEffect, useMemo } from 'react';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { PageLayout } from './ui/Layout/PageLayout';
import { useFurnitureStore } from './stores/FurnitureStore';
import { EmbedBridge } from './embed/EmbedBridge';
import { createLineworkTheme, NotificationHost } from './vendor/accurona-ui';
import { useStore } from './stores/EditorStore';

function App() {
  // Accurona's shared theme, so Axonometra looks like Reticulyne (D12), in
  // the mode Alt + Shift + D picked. CSS variables on: the CSS modules read
  // --mui-* colours.
  const mode = useStore((s) => s.theme);
  const theme = useMemo(
    () => createLineworkTheme(mode, { cssVariables: true }),
    [mode]
  );
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
