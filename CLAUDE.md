# Claude Code instructions for axonometra

> Part of [Projects](../README.md)

## Commit conventions

- **Commit after every discrete change, and push each commit** (`git push` to `origin/main`), as in the rest of the workspace, unless told otherwise for a particular change. (Recorded 2026-09-29 at Adam's request.)
- **Do not rebase, force-push, or amend earlier commits.**

## Port registry

Every host port used anywhere under `/Users/adam/Projects`, including this project's, is recorded in one source of truth: [`/Users/adam/Projects/claude-skills-shared/PORTS.md`](/Users/adam/Projects/claude-skills-shared/PORTS.md). Add or update the row in the same commit as any port binding change, and validate with `python3 /Users/adam/Projects/claude-skills-shared/scripts/check-ports.py`.
