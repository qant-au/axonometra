# Security Policy

## Supported versions

Axonometra is pre-1.0 and breaking changes happen between minor releases.
Only the latest tagged release on `main` receives security fixes.

| Version | Supported          |
| ------- | ------------------ |
| 0.2.x   | :white_check_mark: |
| < 0.2   | :x:                |

## Reporting a vulnerability

**Please do not file a public GitHub issue for security reports.**

Use GitHub's private vulnerability reporting:

→ <https://github.com/qant-au/axonometra/security/advisories/new>

We aim to acknowledge reports within **7 days** and to ship a fix or
mitigation within **30 days** of a confirmed issue. If you do not hear
back, please escalate via the email listed on
[axonometra.com](https://axonometra.com).

When reporting, please include:

- A clear description of the issue and its impact.
- Steps to reproduce (a minimal plan file or HTML harness if applicable).
- The commit SHA or release tag the report applies to.
- Any proof-of-concept code or screenshots.

## In scope

- The SPA bundle (`src/`) — XSS, prototype pollution via plan files,
  unsafe deserialization, DOM clobbering, the file-input handlers.
- The embedding bridge (`src/embed/`) — `postMessage` origin checks,
  URL-parameter handling, `axo:ready` broadcast behaviour.
- The persisted plan format (`src/editor/editor/persistence/`) — parser
  hardening, schema validation, version-dispatch safety.
- The shipped nginx config (`docker/nginx.conf`) — CSP, security
  headers, MIME handling.

## Out of scope

- The upstream **`arcada-backend`** Express server. Axonometra does not
  ship it and does not depend on it — the built-in catalog at
  `src/res/catalog/` replaces its role. Reports against `arcada-backend`
  should go to the [upstream repo](https://github.com/mehanix/arcada).
- Vulnerabilities that require a privileged attacker on the same machine
  (e.g. access to the browser's IndexedDB / `localStorage`).
- Vulnerabilities in development-only dependencies (`vite`, `vitest`,
  ESLint, Playwright) that do not ship with the production build. We
  track these via `npm audit` and patch on major bumps.
- Self-XSS via paste-into-DevTools or via a plan file the user authored
  themselves.

## Disclosure

We prefer coordinated disclosure. Once a fix is released, we will
publish a GitHub security advisory crediting the reporter (unless
anonymity is requested).
