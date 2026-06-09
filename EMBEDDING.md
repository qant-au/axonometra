# Embedding Axonometra

Axonometra can be mounted inside another web app via an `<iframe>` and driven over `postMessage`. This document describes the wire protocol, the URL parameters, the origin allowlist, and the security headers.

> **Status:** v0.2.0 — minimum embedding surface (load, request-save, ready). Authenticated and signed-payload variants are on the roadmap.

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

| Param        | Values | Meaning                                                            |
| ------------ | ------ | ------------------------------------------------------------------ |
| `embed`      | `1`    | Enables the postMessage bridge. Hides the welcome modal.           |
| `readonly`   | `1`    | Hides the toolbar — the user can pan/zoom but can't edit.          |

Both default to off. Both can be combined.

## Protocol

All messages are objects with a `type: 'axo:...'` discriminator. Anything that doesn't match is ignored.

### Inbound (host → Axonometra)

| `type`              | Payload                          | Effect                                                                                                |
| ------------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `axo:load`          | `{ plan: string \| object }`     | Loads `plan` (passed through `FloorPlan.load`). Object form is JSON-stringified. Invalid plans toast. |
| `axo:request-save`  | none                             | Triggers `axo:save` reply to `event.source` with the current plan as a JSON string.                   |
| `axo:ready?`        | none                             | Triggers `axo:ready` reply to `event.source`.                                                         |

### Outbound (Axonometra → host)

| `type`        | Payload                | When                                                              |
| ------------- | ---------------------- | ----------------------------------------------------------------- |
| `axo:ready`   | none                   | Once on mount (broadcast to `window.parent` with `*`), and in reply to `axo:ready?`. |
| `axo:save`    | `{ plan: string }`     | In reply to `axo:request-save`. `plan` is a JSON-string snapshot. |

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

## Out of scope (today)

- Authentication / signed payloads. The host is trusted to send legitimate plans.
- Streaming edits (`axo:diff`). Host gets snapshots via `axo:save`.
- Hot-reloading the allowlist without a redeploy.

File a TODO entry against `axo-` if you need any of these.
