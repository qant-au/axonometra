"""How often the Mastershort integrations were installed or updated through HACS: the download counts
of the release zip of every GitHub release (HACS downloaded exactly this file while hacs.json set
zip_release; from 2.0.1 on HACS fetches single files, so newer releases count manual downloads only).

    python tools/downloads.py                       (all repos below; needs the GitHub CLI "gh")
    python tools/downloads.py cyd-studio            (one repo)

Each install and each update counts once; the sum over all releases is therefore "installs + updates",
the newest release's count roughly the installations that are up to date.
"""

from __future__ import annotations

import json
import subprocess
import sys

OWNER = "Mastershort"
REPOS = ["accurona", "cyd-studio", "zigbee-health"]


def report(repo: str) -> int:
    out = subprocess.run(
        ["gh", "api", f"repos/{OWNER}/{repo}/releases", "--paginate"],
        check=True,
        capture_output=True,
        text=True,
        encoding="utf-8",
    ).stdout
    total = 0
    print()
    print(repo)
    print(f"{'Release':<12} {'Datum':<12} {'Downloads':>10}")
    for r in json.loads(out):
        n = sum(a["download_count"] for a in r.get("assets", []) if a["name"].endswith(".zip"))
        total += n
        print(f"{r['tag_name']:<12} {r['published_at'][:10] if r.get('published_at') else 'Entwurf':<12} {n:>10}")
    print(f"{'Summe':<25} {total:>10}")
    return total


def main() -> None:
    for repo in sys.argv[1:] or REPOS:
        report(repo)


if __name__ == "__main__":
    main()
