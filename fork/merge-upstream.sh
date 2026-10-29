#!/usr/bin/env bash
# Merge an upstream NeonPlan 3D release into Axonometra. The procedure is in fork/MERGING.md.
#
#   fork/merge-upstream.sh v1.24.0
#
# 1. On the snapshot branch (upstream-axonometra), record the upstream tag as a parent and
#    replace the tree with upstream's, put our own files (fork/OURS) back from main, and give it
#    Axonometra's identity: fork/identity.py, ruff format, a frontend rebuild.
# 2. Merge the snapshot into main. Its merge base is the previous snapshot, so the merge
#    carries only what upstream changed, already renamed; it conflicts only where we have
#    changed the same lines.
#
# Env: RUFF (default: ruff), SNAP_BRANCH (default: upstream-axonometra), MAIN_BRANCH (main).
set -euo pipefail

ref="${1:?usage: fork/merge-upstream.sh <upstream tag, e.g. v1.24.0>}"
cd "$(git rev-parse --show-toplevel)"
snap="${SNAP_BRANCH:-upstream-axonometra}"
main="${MAIN_BRANCH:-main}"
ruff="${RUFF:-ruff}"

if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  echo "The working tree has uncommitted changes; commit or stash them first." >&2
  exit 1
fi

git fetch -q upstream --tags
prev="$(cat fork/UPSTREAM)"
ours=()
while IFS= read -r line; do
  case "$line" in ''|'#'*) ;; *) ours+=("$line") ;; esac
done < fork/OURS

echo "== Upstream $prev -> $ref"
echo "Upstream changed these files that Axonometra replaces with its own (review by hand):"
git diff --stat "$prev" "$ref" -- README.md CLAUDE.md LICENSE .github/ISSUE_TEMPLATE/config.yml || true

git switch -q "$snap"
git merge -q -s ours --no-commit "$ref"   # upstream becomes a parent; the tree is set below
git read-tree -u --reset "$ref"           # index and working tree = upstream's release
git checkout "$main" -- "${ours[@]}"      # our own files and tooling, as main has them now
python3 fork/identity.py
"$ruff" format -q custom_components tests
(cd frontend && npm ci --no-audit --no-fund >/dev/null && npm run build)
echo "$ref" > fork/UPSTREAM
# staged with main's ignore rules: upstream's .gitignore knows nothing of our local build output (dist/)
excludes="$(mktemp)"
git show "$main:.gitignore" > "$excludes"
git -c core.excludesFile="$excludes" add -A
rm -f "$excludes"
python3 fork/identity.py --check
git commit -q -m "Upstream $ref, with Axonometra's identity"

git switch -q "$main"
if git merge --no-ff -m "Merge upstream $ref" "$snap"; then
  echo "== Merged. Run the checks (fork/MERGING.md, step 3) before pushing."
else
  echo "== Conflicts: resolve them (fork/MERGING.md, step 2), then commit and run the checks." >&2
  exit 1
fi
