# Accurona: notes for Claude

- Accurona is an intentionally maintained fork of NeonPlan 3D (`Mastershort/neonplan3d`,
  MIT). Upstream is the `upstream` remote, fetch only. Nothing is ever pushed or proposed
  back as a merge.
- **The rename from upstream's identity is a transform, not hand edits.** `fork/identity.py`
  renames upstream's tree and is re-run after every upstream merge. Never hand-edit a
  NeonPlan name into an Accurona one, and never hand-revert one: change the script.
  `python3 fork/identity.py --check` must report `identity: clean`.
- Kept as upstream wrote them, on purpose: the file-format markers (`"neonplan3d"` plan
  export, `neonplan3d-backup`, `neonplan-import`), the pack fingerprint prefix
  `neonplan3d:`, the `.fp3dpack` extension, and every URL on the author's hosts.
  Changing any of them breaks compatibility with NeonPlan 3D plans and packs.
- Keep our changes at the edges (new modules, `fork/`), so the hooks into upstream's core
  files stay small and merges stay cheap.
- **Home Assistant is an optional host, not the base.** The engine talks to its host only
  through upstream's `HomeAssistant` interface (`frontend/src/types.ts`); the standalone host
  (`frontend/src/host/`) answers it from a plan store and a signal source. New host features
  go there, never into the engine as a second code path. The planner's Home Assistant-only parts
  (Assist, the room device panel, time travel, cameras, weather, services, the energy dashboard, HA areas and
  devices) show only when the host marks Home Assistant as there (`frontend/src/homeassistant.ts`); the standalone
  host leaves them off unless `homeAssistant: true` is passed. Check the standalone build with
  `node ../fork/build-standalone.mjs && node ../fork/smoke-standalone.mjs && node ../fork/smoke-hulls.mjs` from
  `frontend/`.
- Domain `accurona`, minimum Home Assistant 2025.1. Frontend in `frontend/` (Lit 3 +
  TypeScript, no decorators; three.js in a separate lazily loaded bundle). Bundles are
  committed to `custom_components/accurona/frontend/` and CI fails when they are stale, so
  run `npm run build` before committing.
- Checks: `npm test`, `npm run typecheck`, `npm run build` (size budgets), `ruff check`,
  `ruff format --check`, `mypy custom_components/accurona`, `pytest -q`.
- The Python tools live in the project's own `.venv/` (gitignored), never in the system Python:
  `python3 -m venv .venv && .venv/bin/pip install -r requirements_test.txt ruff mypy`, then
  `.venv/bin/ruff`, `.venv/bin/mypy`, `.venv/bin/pytest`; `RUFF=.venv/bin/ruff` for
  `fork/merge-upstream.sh`. Home Assistant's test package pins its own versions of shared
  libraries (it downgraded cryptography system-wide once).
- Never commit real floor plans, boat data, IPs or device names.
