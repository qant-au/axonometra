// The Axonometra app: the <Axonometra> component filling the page, with the
// things only a page has - the local save, the remembered theme, and the
// iframe embed protocol (?embed=1).
import { useRef, useState } from 'react';
import { Axonometra, type AxonometraApi } from './lib';
import type { ThemeMode } from './editor/instance/EditorInstance';
import { EmbedBridge } from './embed/EmbedBridge';
import { embedConfig } from './embed/embedConfig';

const THEME_KEY = 'axonometra-theme';
const SAVE_KEY = 'autosave';

function storedTheme(): ThemeMode {
  try {
    return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

function App() {
  const api = useRef<AxonometraApi>(null);
  const [themeMode, setThemeMode] = useState(storedTheme);
  return (
    <>
      <Axonometra
        ref={api}
        // The page is only the editor, so its keys work with nothing focused.
        keyboardScope="document"
        readOnly={embedConfig.readonly}
        // An embedding host loads the plan by postMessage.
        showWelcome={!embedConfig.embedded}
        themeMode={themeMode}
        onThemeModeChange={(mode) => {
          setThemeMode(mode);
          try {
            localStorage.setItem(THEME_KEY, mode);
          } catch {
            // Not stored here (a private window); it still switches.
          }
        }}
        onSave={(sceneText) => {
          localStorage.setItem(SAVE_KEY, sceneText);
          return 'Saved to Local Storage!';
        }}
        loadSaved={() => localStorage.getItem(SAVE_KEY)}
        style={{ height: '100vh' }}
      />
      <EmbedBridge api={api} />
    </>
  );
}
export default App;
