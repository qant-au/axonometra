import { useEffect, useMemo, useState } from 'react';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { PageLayout } from './ui/Layout/PageLayout';
import { EmbedBridge } from './embed/EmbedBridge';
import { embedConfig } from './embed/embedConfig';
import { createLineworkTheme, NotificationHost } from './vendor/accurona-ui';
import { useStore } from './stores/EditorStore';
import { EditorInstance } from './editor/instance/EditorInstance';
import { EditorInstanceContext, useInstance } from './editor/instance/context';

function Shell() {
  const inst = useInstance();
  // Accurona's shared theme, so Axonometra looks like Reticulyne (D12), in
  // the mode Alt + Shift + D picked. CSS variables on: the CSS modules read
  // --mui-* colours.
  const mode = useStore((s) => s.theme);
  const theme = useMemo(
    () => createLineworkTheme(mode, { cssVariables: true }),
    [mode]
  );
  useEffect(() => {
    inst.furniture.getState().getCategories();
  }, [inst]);
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <NotificationHost />
      <PageLayout />
      <EmbedBridge />
    </ThemeProvider>
  );
}

function App() {
  const [inst] = useState(
    () => new EditorInstance({ readOnly: embedConfig.readonly })
  );
  return (
    <EditorInstanceContext.Provider value={inst}>
      <Shell />
    </EditorInstanceContext.Provider>
  );
}
export default App;
