// The postMessage protocol, separated from React so it can be tested.
import {
  importPublicKeys,
  verifySignedPlan,
  VerifyResult
} from './planSignature';

export type AxoInbound =
  | {
      type: 'axo:load';
      plan: unknown;
      signature?: unknown;
      expires?: unknown;
      session?: unknown;
    }
  | { type: 'axo:request-save' }
  | { type: 'axo:ready?' };

export type AxoErrorCode =
  Exclude<VerifyResult, 'ok'> | 'unsigned-object-plan' | 'invalid-plan';

export type AxoOutbound =
  | { type: 'axo:ready' }
  | { type: 'axo:loaded'; session?: string }
  | { type: 'axo:save'; plan: string; session?: string }
  | { type: 'axo:error'; code: AxoErrorCode; message: string };

export function isAxoInbound(data: unknown): data is AxoInbound {
  if (typeof data !== 'object' || data === null) return false;
  const type = (data as { type?: unknown }).type;
  return typeof type === 'string' && type.startsWith('axo:');
}

const MESSAGES: Record<AxoErrorCode, string> = {
  'missing-signature': 'This editor only accepts signed plans.',
  'missing-expiry': 'A signed plan must say when its signature expires.',
  expired: 'The plan signature has expired.',
  'bad-signature': 'The plan signature is not valid for this plan.',
  'unsigned-object-plan':
    'Signed plans must be sent as the exact JSON string that was signed.',
  'invalid-plan': 'The plan could not be read.'
};

export interface InboundDeps {
  publicKeys: string[];
  /** Load the plan text; returns false if the plan itself was rejected. */
  load: (planText: string) => boolean;
  serialize: () => string;
  /** Tell the person using the editor that a plan was refused. */
  notify: (message: string) => void;
  now?: () => number;
}

export function createInboundHandler(deps: InboundDeps) {
  const signingRequired = deps.publicKeys.length > 0;
  const keys = signingRequired ? importPublicKeys(deps.publicKeys) : null;
  let session: string | undefined;
  // Loads verify asynchronously; only the newest may land.
  let latestLoad = 0;

  return async function handle(
    message: AxoInbound,
    reply: (out: AxoOutbound) => void
  ): Promise<void> {
    switch (message.type) {
      case 'axo:ready?':
        reply({ type: 'axo:ready' });
        return;

      case 'axo:request-save':
        reply({ type: 'axo:save', plan: deps.serialize(), session });
        return;

      case 'axo:load': {
        const ticket = ++latestLoad;
        const nextSession =
          typeof message.session === 'string' ? message.session : undefined;
        const fail = (code: AxoErrorCode) => {
          deps.notify(MESSAGES[code]);
          reply({ type: 'axo:error', code, message: MESSAGES[code] });
        };

        let planText: string;
        if (typeof message.plan === 'string') {
          planText = message.plan;
        } else if (message.plan && typeof message.plan === 'object') {
          // An object is re-serialised here, so its bytes are not the ones
          // the host signed.
          if (signingRequired) return fail('unsigned-object-plan');
          planText = JSON.stringify(message.plan);
        } else {
          return fail('invalid-plan');
        }

        if (keys) {
          const result = await verifySignedPlan(
            {
              plan: planText,
              signature:
                typeof message.signature === 'string'
                  ? message.signature
                  : undefined,
              expires:
                typeof message.expires === 'number'
                  ? message.expires
                  : undefined,
              session: nextSession
            },
            await keys,
            Math.floor((deps.now?.() ?? Date.now()) / 1000)
          );
          if (ticket !== latestLoad) return;
          if (result !== 'ok') return fail(result);
        }

        // load() has already told the person what was wrong with the plan.
        if (!deps.load(planText)) {
          reply({
            type: 'axo:error',
            code: 'invalid-plan',
            message: MESSAGES['invalid-plan']
          });
          return;
        }
        session = nextSession;
        reply({ type: 'axo:loaded', session });
        return;
      }
    }
  };
}
