"""Downloads the latest release the way HACS does (aiohttp with its default limits), so a change on
GitHub's side that breaks HACS installs is noticed within hours instead of from user reports.

    python tools/hacs_download_check.py

Found the hard way: on 23 October 2026 GitHub's release download redirects started carrying a 9 KB
header, aiohttp stops at 8 KB, and every HACS download of a release zip failed (hacs/integration#5643).

Checks the path HACS uses for Accurona (the release zip with zip_release in hacs.json, otherwise single
files from raw.githubusercontent.com) and fails when it is broken. The other paths are only reported,
so the log also says when the release zip works again and zip_release can be switched back on.
"""

from __future__ import annotations

import asyncio
import json
from pathlib import Path
import sys
import urllib.request

import aiohttp

REPO = "Mastershort/accurona"
ROOT = Path(__file__).resolve().parent.parent


def latest_tag() -> str:
    with urllib.request.urlopen(f"https://api.github.com/repos/{REPO}/releases/latest", timeout=30) as r:
        return json.load(r)["tag_name"]


async def fetch(session: aiohttp.ClientSession, url: str) -> str:
    """'ok' or the reason the download failed, like HACS' async_download_file sees it."""
    try:
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=60)) as resp:
            if resp.status != 200:
                return f"HTTP {resp.status}"
            await resp.read()
            return "ok"
    except Exception as err:  # every failure is a finding here
        return f"{type(err).__name__}: {str(err)[:160]}"


async def main() -> int:
    tag = latest_tag()
    manifest = json.loads((ROOT / "hacs.json").read_text(encoding="utf-8"))
    paths = {
        "release zip": f"https://github.com/{REPO}/releases/download/{tag}/accurona.zip",
        "repository archive": f"https://github.com/{REPO}/archive/refs/tags/{tag}.zip",
        "single files": f"https://raw.githubusercontent.com/{REPO}/{tag}/custom_components/accurona/manifest.json",
    }
    used = "release zip" if manifest.get("zip_release") else "single files"
    async with aiohttp.ClientSession() as session:
        results = {name: await fetch(session, url) for name, url in paths.items()}
    print(f"latest release {tag}, HACS uses: {used}")
    for name, result in results.items():
        print(f"{'ok  ' if result == 'ok' else 'FAIL'} {name}: {result}{'   <- used by HACS' if name == used else ''}")
    if used != "release zip" and results["release zip"] == "ok":
        print("note: the release zip downloads again, zip_release can be switched back on in hacs.json")
    return 0 if results[used] == "ok" else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
