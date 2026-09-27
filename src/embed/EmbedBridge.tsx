import { useEffect } from 'react';
import { notifications } from '@mantine/notifications';
import { serializer } from '../editor/editor/persistence/Serializer';
import { embedConfig, originAllowed } from './embedConfig';
import { createInboundHandler, isAxoInbound } from './inbound';

// React component (rendered as null) that wires window.postMessage <->
// the floor plan when ?embed=1 is set. Removed on unmount. The protocol
// itself lives in inbound.ts.
export function EmbedBridge(): null {
  useEffect(() => {
    if (!embedConfig.embedded) return undefined;

    const handle = createInboundHandler({
      publicKeys: embedConfig.planPublicKeys,
      load: (planText) => serializer.load(planText),
      serialize: () => serializer.serialize(),
      notify: (message) =>
        notifications.show({ title: 'Plan refused', message, color: 'red' })
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
  }, []);

  return null;
}
