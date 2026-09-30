# Contributing to Axonometra

Thanks for your interest in Axonometra, an open-source floor planner with a 3D view. It is pre-1.0, so expect breaking
changes between minor versions.

## Ground rules

- Be civil. Everyone taking part follows the [Code of Conduct](CODE_OF_CONDUCT.md).
- Security issues go to private vulnerability reporting, never a public issue. See
  [SECURITY.md](SECURITY.md).
- Everything else goes in [issues](https://github.com/qant-au/axonometra/issues): bug reports,
  feature requests and questions alike.
- For anything substantial, open an issue first so we can agree on the scope before you
  write code.

## Development setup

```bash
git clone https://github.com/qant-au/axonometra.git
cd axonometra
nvm use            # from .nvmrc
npm ci
npm run dev        # Vite dev server on http://localhost:4891
```

For a production-like preview (nginx and the CSP headers, on http://localhost:4890),
which is also what the end-to-end tests run against:

```bash
NO_WATCH=1 bash restart.sh
```

## Checks before opening a pull request

```bash
npm run lint           # ESLint
npm run format:check   # Prettier
npx tsc --noEmit       # TypeScript, strict
npm test               # Vitest unit tests
```

For changes to the editor canvas or the embedding bridge, also run the Playwright suite
against the preview (`PLAYWRIGHT_BASE_URL=http://localhost:4891` targets the dev server
instead):

```bash
npm run test:e2e
```

## Commit style

Use [Conventional Commits](https://www.conventionalcommits.org/),
`<type>(<scope>): <subject>`, where the scope is the area of the code you changed:

```
fix(walls): keep door openings when a wall is split
feat(embed): add the axo:export message
docs(plan-format): document format v2
```

Keep each commit to one logical change.

## Pull request process

1. Fork the repo and branch off `main` (`feature/`, `fix/`, `docs/` or `chore/`).
2. Make your change, with tests where it makes sense.
3. Run the checks above.
4. Open the pull request and link the issue it addresses (`Closes #123`).
5. Expect at least one round of review.
6. Pull requests are squash-merged, with a Conventional Commits message.

## Where things live

- `src/editor/` - the Pixi.js floor-plan engine; `src/editor/scene3d/` - the 3D view.
- `src/lib/` - the `<Axonometra>` component and the npm package's entry.
- `src/ui/` - the React components, built on MUI and Accurona's shared UI (`@accurona/ui`).
- `src/stores/` - Zustand stores.
- `src/embed/` - the iframe `postMessage` bridge.
- `src/res/catalog/` - the catalogue. Doors and windows are local (`wall-fittings.json`); furniture and equipment come from [Accurona](https://github.com/qant-au/accurona)'s `@accurona/elements` package. To ask for a new item or a change to one, open an issue on Accurona.
- `e2e/` - Playwright specs; `src/**/__tests__/` - Vitest tests.
- `Dockerfile`, `docker/` - the preview image.

## Documentation

- [README.md](README.md) - what Axonometra is and how to use it.
- [EMBEDDING.md](EMBEDDING.md) - the embedding contract: `postMessage`, URL parameters, the origin allowlist, signed plans.
- [PLAN-FORMAT.md](PLAN-FORMAT.md) - the saved plan format.
- [CHANGELOG.md](CHANGELOG.md) - release notes.

## Licence

`MIT AND Apache-2.0`: code that came from Arcada stays under the Apache License 2.0 and new work is MIT. See [LICENSE](LICENSE).
