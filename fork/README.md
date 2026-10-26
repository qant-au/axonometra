# fork/

The fork's own tooling and files, kept in one place at the edge of the tree so upstream
merges never touch them.

| Path | What it is |
|---|---|
| `identity.py` | Renames upstream's tree to Accurona. Re-run after every upstream merge; `--check` must be clean. |
| `merge-upstream.sh`, `MERGING.md` | Merging an upstream release, and the procedure behind it. |
| `OURS` | Files that are wholly ours; a merge puts them back rather than taking upstream's. |
| `UPSTREAM` | The upstream release the tree was last synced to. |
| `build-standalone.mjs`, `standalone/` | The engine with no Home Assistant: `dist/standalone/` with the embedding API (`frontend/src/host/`) and a demo page, and the hull viewer (`hulls.html`, `frontend/src/hull/viewer.ts`). |
| `smoke-standalone.mjs` | Mounts that build in a headless Chrome and fails on any page error (CI: `fork.yml`). |
| `smoke-hulls.mjs` | Opens the hull viewer headless and shows every hull in the catalogue, failing on any page error or bad number (CI: `fork.yml`). |
| `../demos/` | The hull turntable GIFs in `docs/demos/`, recorded from the hull viewer (`demos/README.md`). |
| `brand/` | The integration's icons, copied over upstream's by `identity.py`. |
| `github/` | GitHub files copied over upstream's by `identity.py` (the issue chooser). |

## Repository decisions

- **Workflows.** Kept from upstream: `ci.yml` (frontend, Python, hassfest, HACS),
  `release.yml` (release zip) and `issue-labels.yml`. Dropped by `identity.py`:
  `discord-release.yml` (posts to the author's Discord), `shop-check.yml` (probes his
  shop) and `pages.yml` (publishes his site). Added: `fork.yml`, which runs
  `identity.py --check` and builds and smoke-tests the standalone engine.
- **Secrets.** None. No retained workflow needs one, in the Actions store or the
  Dependabot store: nothing reaches a private registry or an outside service.
- **Dependabot.** Security updates only; versions arrive with upstream merges.
  The same for GitHub Actions, whose bumps would touch upstream's workflows.
- **Branch protection on `main`.** Force pushes and branch deletion are blocked; direct
  pushes are allowed.
- **Issues and Discussions** are on. The issue chooser sends ideas and questions to
  Discussions.

## The upstream author's online services

NeonPlan 3D sells its Pro add-ons and packs through its author's shop (mastershort.de), and
the app talks to it: licence keys, the pack catalogue and downloads, offers, the newsletter,
gift and news notices, Pro teasers linking to the shop, and opt-in usage reports. Accurona
keeps all of that code in the tree and maintained, so it could be switched on with the
author's cooperation, but it is **off**: nothing reaches his servers and none of it shows.

- **The switches.** `custom_components/accurona/upstream.py` (`UPSTREAM_SERVICES = False`)
  and `frontend/src/upstream.ts` (`upstreamServices()` returns false). They are the only
  places to change, together, and only after agreeing it with the author.
- **Where they bite.** Backend: the shop's and the usage report's single request function
  (`license._post`, `DiagnosticsReporter._post`). Frontend: `released()` in `features.ts`
  (an add-on is advertised only once a pack unlocks it), the Extensions tab and route,
  the offers check and gift notice, the news notice, four Pro teasers in the editor, and
  the import page's stats beacon. Each hook is one line marked `Accurona:`.
- **Still maintained.** Upstream's tests run with the services on (`tests/conftest.py`,
  `features.test.ts`), so the shop code stays tested through every merge.
  `tests/test_upstream_services.py` and `frontend/src/upstream.test.ts` prove that, switched
  off, nothing is sent and nothing is advertised.
- **Kept identical to upstream** so a switch-on reaches the author unchanged: every URL on
  his hosts, the pack fingerprint, the shop's referral tag (all protected in `identity.py`).
- **What a user loses while it is off:** the Extensions page, which is also where a pack
  bought from the author is imported by hand. Packs already installed keep working.
