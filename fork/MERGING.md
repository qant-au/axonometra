# Merging upstream

Axonometra merges NeonPlan 3D's releases on a schedule and never sends anything back. The
rename to Axonometra is a script (`fork/identity.py`), so a merge never re-does it by hand.

## The two branches

- **`upstream-axonometra`** holds one commit per upstream release: upstream's tree with
  Axonometra's identity applied, plus our own files (`fork/OURS`), copied from `main` so
  the snapshot is always made with the current tooling. Each of those commits
  has the upstream tag as a parent, so `git log` shows upstream's history and
  `git merge-base --is-ancestor <tag> main` holds after a merge.
- **`main`** is where our work happens. It only ever merges `upstream-axonometra`, so the
  merge base is always the previous snapshot and a merge carries exactly what upstream
  changed between two releases, already renamed.

`fork/UPSTREAM` names the release the last snapshot was made from.

## Merging a release

Prerequisites: a clean working tree, `ruff` on the PATH (or `RUFF=/path/to/ruff`),
Node 24 and npm, and the `upstream` remote (`https://github.com/Mastershort/neonplan3d.git`,
push URL set to `DISABLED`).

1. **Run the script** on `main`:

   ```sh
   fork/merge-upstream.sh v1.24.0
   ```

   It prints the upstream changes to files we replace (`README.md`, `CLAUDE.md`,
   `LICENSE`, the issue chooser). Read them: a new licence term or a credit to carry
   over has to be brought across by hand.

2. **Resolve conflicts**, if the merge stops. They happen only where we changed a line
   upstream also changed. Rules:
   - Built bundles (`custom_components/axonometra/frontend/*.js`, `site/import/*.js`):
     never resolve by hand. Take either side, then `cd frontend && npm run build`.
   - `frontend/package.json` and `package-lock.json`: take upstream's versions unless we
     added a dependency, then re-run `npm install` to regenerate the lock.
   - A NeonPlan name reappearing: fix it in `fork/identity.py`, never in place, and re-run
     the script on the snapshot branch.
   - Everything else: keep both intents; that is ordinary merge work.

   Then `git commit`.

3. **Run the checks** before pushing:

   ```sh
   python3 fork/identity.py --check        # identity: clean
   (cd frontend && npm test && npm run typecheck && npm run build)
   git diff --exit-code                    # bundles reproduce
   ruff check custom_components tests && ruff format --check custom_components tests
   mypy custom_components/axonometra && pytest -q
   ```

4. **Push both branches**: `git push origin main upstream-axonometra`.

## Keeping merges cheap

- New work goes in new modules and in `fork/`. Hooks into upstream's core files stay as
  few and as small as possible.
- Anything that only differs because of naming belongs in `fork/identity.py`.
- Files that are wholly ours go in `fork/OURS`.

## Rehearsal record

2026-10-21: rehearsed on a throwaway clone with upstream `main` at `c695320`
(v1.23.1 plus two commits, one new test), in place of a tag. It found two faults, both
fixed in `identity.py`: deleting a file during the merge needs `git rm -f`, and upstream's
new unreleased-add-on guard read the `ROADMAP.md` the fork drops (now an override). After
the fixes the snapshot built, `identity --check` was clean, the merge into `main` applied
without conflicts and carried only upstream's change, `c695320` became an ancestor of
`main`, and every check in step 3 passed (417 frontend tests, 88 Python tests).
