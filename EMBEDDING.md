# Embedding Axonometra

Axonometra can be mounted inside another web app via an `<iframe>` and driven over `postMessage`. This document describes the wire protocol, the URL parameters, the origin allowlist, and the security headers.

> **Status:** load, request-save and ready since v0.2.0. Signed plan loads and session binding were added after v0.3.0; see [Signed plans](#signed-plans).

## Quick start

Host page:

```html
<iframe
  id="axo"
  src="https://your-axonometra-deploy.example.com/?embed=1&readonly=0"
  style="border:0;width:100%;height:600px"
></iframe>
<script>
  const frame = document.getElementById('axo');
  const axoOrigin = 'https://your-axonometra-deploy.example.com';

  window.addEventListener('message', (event) => {
    if (event.origin !== axoOrigin) return;
    if (event.data?.type === 'axo:ready') {
      // Load a saved plan
      frame.contentWindow.postMessage(
        { type: 'axo:load', plan: SAVED_PLAN_JSON_OR_OBJECT },
        axoOrigin
      );
    }
    if (event.data?.type === 'axo:save') {
      // event.data.plan is a JSON string
      console.log('plan saved', event.data.plan);
    }
  });

  // Trigger a save round-trip later
  function requestSave() {
    frame.contentWindow.postMessage({ type: 'axo:request-save' }, axoOrigin);
  }
</script>
```

## URL parameters

| Param      | Values | Meaning                                                   |
| ---------- | ------ | --------------------------------------------------------- |
| `embed`    | `1`    | Enables the postMessage bridge. Hides the welcome modal.  |
| `readonly` | `1`    | Hides the toolbar — the user can pan/zoom but can't edit. |

Both default to off. Both can be combined.

## Protocol

All messages are objects with a `type: 'axo:...'` discriminator. Anything that doesn't match is ignored.

### Inbound (host → Axonometra)

| `type`             | Payload                                                                              | Effect                                                                                                                                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `axo:load`         | `{ plan: string \| object, session?: string, signature?: string, expires?: number }` | Loads `plan`. The object form is JSON-stringified, in unsigned mode only. `session` is echoed on later saves. With signing on, `signature` and `expires` are required. Replies `axo:loaded` or `axo:error`. |
| `axo:request-save` | none                                                                                 | Triggers `axo:save` reply to `event.source` with the current plan as a JSON string.                                                                                                                         |
| `axo:ready?`       | none                                                                                 | Triggers `axo:ready` reply to `event.source`.                                                                                                                                                               |

### Outbound (Axonometra → host)

| `type`       | Payload                              | When                                                                                                                                                                                        |
| ------------ | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `axo:ready`  | none                                 | Once on mount (broadcast to `window.parent` with `*`), and in reply to `axo:ready?`.                                                                                                        |
| `axo:save`   | `{ plan: string, session?: string }` | In reply to `axo:request-save`. `plan` is a JSON-string snapshot; `session` is the one from the last accepted load.                                                                         |
| `axo:loaded` | `{ session?: string }`               | A plan from `axo:load` was accepted and is now in the editor.                                                                                                                               |
| `axo:error`  | `{ code: string, message: string }`  | An `axo:load` was refused. Codes: `missing-signature`, `missing-expiry`, `expired`, `bad-signature`, `unsigned-object-plan`, `invalid-plan`. The person using the editor also sees a toast. |

## Origin allowlist

Inbound messages from origins not on the allowlist are dropped. Configure the allowlist at build time via the `VITE_EMBED_ALLOWED_ORIGINS` environment variable (comma-separated):

```bash
VITE_EMBED_ALLOWED_ORIGINS=https://app.example.com,https://staging.example.com npm run build
```

**Default is empty (deny all).** Setting `*` accepts any origin (development only — a console warning is logged).

The mount-time `axo:ready` broadcast uses `targetOrigin: '*'` deliberately because the parent's origin is not yet known. The payload carries nothing sensitive.

## Frame-ancestors (CSP)

`docker/nginx.conf` sets `Content-Security-Policy` with `frame-ancestors 'self'` by default — the browser will refuse to embed Axonometra in any cross-origin iframe. To allow specific embedders, edit the `Content-Security-Policy` lines in `docker/nginx.conf` and append the embedder origins after `'self'`:

```
add_header Content-Security-Policy "... frame-ancestors 'self' https://app.example.com;" always;
```

The legacy `X-Frame-Options` header has been removed in favour of CSP — `X-Frame-Options` only supported a single same-origin/deny binary, while CSP's `frame-ancestors` accepts an arbitrary allowlist.

## Plan format

The `plan` payload is a `FloorPlanSerializable` JSON object — see `src/editor/editor/persistence/FloorPlanSerializable.ts`. The current schema is `version: 1`; future versions will be dispatched in `FloorPlan.load`.

## Signed plans

The origin allowlist already tells the editor _which page_ is talking to it, because the browser sets `event.origin`. Signing adds proof that a plan came from _your backend_, unchanged, recently, and for this session. That protects against a plan altered in storage or in the page, and against an old plan, or someone else's, being replayed into the editor.

Nothing secret lives in the browser. Your backend holds an **ECDSA P-256 private key**; Axonometra is built with the matching **public key**, so a page cannot substitute a key of its own.

### Turn it on

1. Generate a key pair once, on your backend:

   ```bash
   openssl ecparam -name prime256v1 -genkey -noout -out axo-plan.key
   openssl ec -in axo-plan.key -pubout -outform DER | base64 | tr -d '\n'
   ```

2. Build Axonometra with the printed public key (base64 SPKI; PEM is also accepted):

   ```bash
   VITE_EMBED_PLAN_PUBLIC_KEYS=MFkwEwYHKoZIzj0CAQYI... npm run build
   ```

   To rotate, list the new key beside the old one (comma-separated), move your backend to the new key, then drop the old one on the next build.

When `VITE_EMBED_PLAN_PUBLIC_KEYS` is set, **every** `axo:load` must be signed. When it is unset, loads behave as before.

### Sign on your backend

Sign the UTF-8 bytes of these four lines, joined with `\n`:

```
axo-plan-v1
<expires>
<session>
<plan>
```

- `expires` is a Unix time in seconds. Keep it short (minutes); expired signatures are refused.
- `session` is your own opaque token for this editing session, or an empty line if you do not use one. A signature made for one session is refused with another.
- `plan` is the exact JSON string you send. Send `plan` as that string, not an object: an object is re-serialised in the browser and its bytes would no longer match.

Node:

```js
import { createSign } from 'node:crypto';

const expires = Math.floor(Date.now() / 1000) + 300;
const signer = createSign('SHA256');
signer.update(`axo-plan-v1\n${expires}\n${session}\n${planJson}`);
const signature = signer.sign(privateKeyPem).toString('base64');
// hand { plan: planJson, session, expires, signature } to the page
```

The signature may be DER (the default for Node and OpenSSL) or raw `r||s` (IEEE P1363), in base64 or base64url.

The page forwards it unchanged:

```js
frame.contentWindow.postMessage(
  { type: 'axo:load', plan, session, expires, signature },
  axoOrigin
);
```

### Saving back

The editor cannot sign what it sends, because anything in the browser can be read. Your page authenticates `axo:save` by checking `event.origin` against the editor's origin, as in the quick start. Your backend then checks the `session` echoed in the save against the one it issued before accepting the plan.

## Out of scope (today)

- Streaming edits (`axo:diff`). Host gets snapshots via `axo:save`.
- Hot-reloading the allowlist without a redeploy.

File a TODO entry against `axo-` if you need any of these.
