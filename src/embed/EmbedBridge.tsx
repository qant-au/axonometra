import { useEffect } from 'react';
import { FloorPlan } from '../editor/editor/objects/FloorPlan';
import { embedConfig, originAllowed } from './embedConfig';

type AxoInbound =
  | { type: 'axo:load'; plan: unknown }
  | { type: 'axo:request-save' }
  | { type: 'axo:ready?' };

function isAxoInbound(data: unknown): data is AxoInbound {
  if (typeof data !== 'object' || data === null) return false;
  const type = (data as { type?: unknown }).type;
  return typeof type === 'string' && type.startsWith('axo:');
}

function normalisePlanInput(plan: unknown): string | null {
  if (typeof plan === 'string') return plan;
  if (plan && typeof plan === 'object') return JSON.stringify(plan);
  return null;
}

// React component (rendered as null) that wires window.postMessage <->
// FloorPlan when ?embed=1 is set. Removed on unmount.
export function EmbedBridge(): null {
  useEffect(() => {
    if (!embedConfig.embedded) return undefined;

    const handler = (event: MessageEvent) => {
      if (!originAllowed(event.origin)) return;
      if (!isAxoInbound(event.data)) return;
      const source = event.source as Window | null;
      switch (event.data.type) {
        case 'axo:load': {
          const planText = normalisePlanInput(event.data.plan);
          if (planText != null) FloorPlan.Instance.load(planText);
          break;
        }
        case 'axo:request-save': {
          const planText = FloorPlan.Instance.save();
          source?.postMessage(
            { type: 'axo:save', plan: planText },
            event.origin
          );
          break;
        }
        case 'axo:ready?': {
          source?.postMessage({ type: 'axo:ready' }, event.origin);
          break;
        }
      }
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
