# Security policy

## Supported versions

Axonometra is pre-1.0, and breaking changes can happen between minor releases. Only the
latest release receives security fixes.

| Version | Supported |
| ------- | --------- |
| 0.5.x   | Yes       |
| < 0.5   | No        |

## Reporting a vulnerability

**Please do not open a public issue for a security report.** Use GitHub's private
vulnerability reporting instead:

<https://github.com/qant-au/axonometra/security/advisories/new>

We aim to acknowledge a report within **7 days** and to ship a fix or mitigation within
**30 days** of confirming it. If you have not heard back, please follow up through the
maintainer's contact form at <https://adamburgess.me/contact>.

Please include:

- a clear description of the issue and its impact;
- steps to reproduce (a minimal plan file or HTML harness, if applicable);
- the release or commit SHA the report applies to;
- any proof-of-concept code or screenshots.

## In scope

- The app bundle (`src/`): XSS, prototype pollution through plan files, unsafe deserialisation, DOM clobbering, the file-input handlers.
- The embedding bridge (`src/embed/`): `postMessage` origin checks, URL-parameter handling, signed-plan verification.
- The saved plan format (`src/editor/editor/persistence/`): parser hardening, schema validation, version handling.
- The Docker image (`Dockerfile`, `docker/nginx.conf`): CSP, security headers, MIME handling.

## Out of scope

- The upstream [Arcada](https://github.com/mehanix/arcada) project and its `arcada-backend` server, which Axonometra does not ship.
- Attacks that need a privileged attacker on the same machine (for example, access to the browser's local storage).
- Vulnerabilities in development-only dependencies that do not ship in the build; these are tracked with `npm audit`, which also runs in CI.
- Self-XSS, for example pasting script into the browser's developer tools, or a file the user wrote themselves.

## Disclosure

We prefer coordinated disclosure. Once a fix is released we publish a GitHub security
advisory that credits the reporter, unless they ask to stay anonymous.
