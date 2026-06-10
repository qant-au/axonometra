# Contributing to Axonometra

Thanks for your interest in Axonometra! This project is in active
pre-1.0 development; expect breaking changes between minor versions.

## Ground rules

- Be civil. See [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md) if present.
- Security issues go to private vulnerability reporting, not public
  issues — see [`SECURITY.md`](./SECURITY.md).
- Substantial work should start as a GitHub Discussion or Issue so we
  can agree on scope before you write code.

## Development setup

Requires Node.js >= 20 (see `package.json` engines).

```bash
git clone https://github.com/qant-au/axonometra.git
cd axonometra
npm install
npm run dev          # Vite dev server on http://localhost:4891
```

For a containerised local preview (production-like, includes nginx and
the CSP headers — serves on `http://localhost:4890`):

```bash
bash restart.sh NO_WATCH=1
```

## Required checks before opening a PR

All four must pass locally — they all run in CI:

```bash
npm run lint         # ESLint flat config
npm run format:check # Prettier
npx tsc --noEmit     # TypeScript strict + strictNullChecks
npm run test         # Vitest unit tests
```

For changes that touch the editor canvas or the embedding bridge, also
run:

```bash
npm run test:e2e     # Playwright; requires the dev server running
```

`playwright.config.ts` defaults to `http://localhost:4890` (the
containerised preview from `restart.sh`); start that in another shell
first. To run against the Vite dev server instead, set
`PLAYWRIGHT_BASE_URL=http://localhost:4891`.

## Commit style

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
fix(floorplan): guard JSON.parse against null autosave
feat(embed): add axo:request-save outbound message
perf(walls): drop redundant mousemove redraw subscription
test(editor): add Serializer round-trip coverage
chore(deps): bump vite to 6
docs(readme): document the embedding bridge
refactor(types): widen FurnitureSerializable.attachedToLeft to optional
```

Scopes follow the directory or subsystem the change targets
(`floorplan`, `walls`, `furniture`, `embed`, `catalog`, `e2e`, etc.).
The scope is optional but encouraged.

Keep commits focused — one logical change per commit. Big PRs that fan
across subsystems should be split into multiple commits with a clear
narrative.

## Pull request process

1. Fork or create a topic branch off `main`.
2. Make your change. Add tests where it makes sense.
3. Run the required checks above.
4. Open the PR. Reference any related issue or TODO ID
   (`@id(axo-XXX)`).
5. Expect at least one review round. Reviewers will run the
   verification checklist before merging.
6. Squash-merge by default. The squash commit message should follow
   Conventional Commits.

## Where things live

- `src/editor/` — the Pixi.js floor-plan engine.
- `src/ui/` — Mantine React components.
- `src/stores/` — Zustand stores (UI state, not engine model).
- `src/embed/` — the iframe `postMessage` bridge.
- `src/res/catalog/` — the built-in furniture / door / window catalog.
- `e2e/` — Playwright specs.
- `src/editor/editor/__tests__/` — engine unit tests.
- `src/test/pixiMock.ts` — minimal Pixi stub used by the unit tests.
- `docker/` — production nginx config and Dockerfile.

## Documentation conventions

- README.md — user-facing overview.
- [`EMBEDDING.md`](./EMBEDDING.md) — embedding contract (postMessage,
  URL params, origin allowlist, CSP).
- [`PLAN-FORMAT.md`](./PLAN-FORMAT.md) — persisted plan file format.
- [`CHANGELOG.md`](./CHANGELOG.md) — Keep-a-Changelog log of releases.
- `TODO.md` — roadmap; tasks use stable `@id(axo-XXX)` identifiers.
- `STAGE*-REVIEW.md`, `code-review-*.md`, `action-items-*.md` —
  historical reviews and their derived action items. Don't modify these
  except to record resolution status on the items themselves.

## Questions

Open a GitHub Discussion. For private questions, see the contact on
[axonometra.com](https://axonometra.com).
