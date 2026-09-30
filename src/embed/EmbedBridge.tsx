import { useEffect } from 'react';
import { useInstance } from '../editor/instance/context';
import { embedConfig, originAllowed } from './embedConfig';
import { createInboundHandler, isAxoInbound } from './inbound';

// React component (rendered as null) that wires window.postMessage <->
// the floor plan when ?embed=1 is set. Removed on unmount. The protocol
// itself lives in inbound.ts.
export function EmbedBridge(): null {
  const inst = useInstance();
  useEffect(() => {
    if (!embedConfig.embedded) return undefined;

    const handle = createInboundHandler({
      publicKeys: embedConfig.planPublicKeys,
      load: (planText) => inst.serializer.load(planText),
      // The saved file: an Accurona scene.
      serialize: () => inst.serializer.sceneText(),
      // three.js only downloads when a host first asks for a model.
      exportGlb: async () =>
        (await import('../editor/scene3d/exportGlb')).exportGlb(
          inst.serializer.serialize()
        ),
      notify: (message) =>
        inst.notify({ title: 'Plan refused', message, severity: 'error' })
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
  }, [inst]);

  return null;
}
