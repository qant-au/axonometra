import { useEffect, type RefObject } from 'react';
import type { AxonometraApi } from '../lib';
import { embedConfig, originAllowed } from './embedConfig';
import { createInboundHandler, isAxoInbound } from './inbound';

// React component (rendered as null) that wires window.postMessage <->
// the editor's API when ?embed=1 is set. Removed on unmount. The protocol
// itself lives in inbound.ts.
export function EmbedBridge({
  api
}: {
  api: RefObject<AxonometraApi | null>;
}): null {
  useEffect(() => {
    if (!embedConfig.embedded) return undefined;

    const handle = createInboundHandler({
      publicKeys: embedConfig.planPublicKeys,
      load: (planText) => api.current?.load(planText) ?? false,
      // The saved file: an Accurona scene.
      serialize: () => api.current?.getSceneText() ?? '',
      exportGlb: () => {
        if (!api.current) return Promise.reject(new Error('Not ready'));
        return api.current.exportGlb();
      },
      notify: (message) =>
        api.current?.notify({
          title: 'Plan refused',
          message,
          severity: 'error'
        })
    });

    const handler = (event: MessageEvent) => {
      if (!originAllowed(event.origin)) return;
      if (!isAxoInbound(event.data)) return;
      const source = event.source as Window | null;
      void handle(event.data, (out) => source?.postMessage(out, event.origin));
    };
    window.addEventListener('message', handler);

    // Best-effort ready ping. We can't pin a targetOrigin here because
    // the parent may legitimately be one we haven't allowlisted yet
    // (host discovery flow); '*' is deliberate. The payload carries
    // nothing sensitive.
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'axo:ready' }, '*');
    }

    return () => window.removeEventListener('message', handler);
  }, [api]);

  return null;
}
