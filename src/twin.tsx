// Two editors on one page (twin.html, dev only). e2e/isolation.spec.ts drives
// them through window.__axoTwin to show they share nothing.
import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Axonometra, type AxonometraApi } from './lib';

declare global {
  interface Window {
    __axoTwin?: {
      a: AxonometraApi | null;
      b: AxonometraApi | null;
    };
  }
}

function Twin() {
  const a = useRef<AxonometraApi>(null);
  const b = useRef<AxonometraApi>(null);
  const [showA, setShowA] = useState(true);
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <button type="button" onClick={() => setShowA(false)}>
        Remove editor A
      </button>
      <div style={{ display: 'flex', flex: 1, gap: 8, minHeight: 0 }}>
        <section aria-label="Editor A" style={{ flex: 1 }}>
          {showA && <Axonometra ref={a} showWelcome={false} />}
        </section>
        <section aria-label="Editor B" style={{ flex: 1 }}>
          <Axonometra ref={b} showWelcome={false} />
        </section>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Twin />
  </StrictMode>
);
