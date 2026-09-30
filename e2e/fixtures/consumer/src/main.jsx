// A third-party app using the published package: two editors on one page,
// imported from @axonometra/editor exactly as a host would.
import { StrictMode, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Axonometra } from '@axonometra/editor';

function App() {
  const a = useRef(null);
  const b = useRef(null);
  useEffect(() => {
    window.__axoTwin = {
      get a() {
        return a.current;
      },
      get b() {
        return b.current;
      }
    };
  }, []);
  return (
    <div style={{ display: 'flex', gap: 8, height: '100vh' }}>
      <section aria-label="Editor A" style={{ flex: 1 }}>
        <Axonometra ref={a} showWelcome={false} />
      </section>
      <section aria-label="Editor B" style={{ flex: 1 }}>
        <Axonometra ref={b} showWelcome={false} themeMode="dark" />
      </section>
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
