#!/usr/bin/env python3
"""
Apply definite-assignment `!` to class properties flagged by TS2564.
Idempotent — won't double-stamp.
"""
from __future__ import annotations

import re
import subprocess
import sys
from collections import defaultdict
from pathlib import Path


def collect():
    p = subprocess.run(
        ['npx', 'tsc', '--noEmit'],
        capture_output=True, text=True, cwd='.', check=False,
    )
    out = (p.stdout or '') + (p.stderr or '')
    by_file: dict[str, list[tuple[int, str]]] = defaultdict(list)
    for line in out.splitlines():
        m = re.match(r'(.+?)\((\d+),(\d+)\): error TS2564: (.+)', line)
        if not m:
            continue
        f, ln, _, msg = m.groups()
        nm = re.search(r"Property '([^']+)'", msg)
        if not nm:
            continue
        by_file[f].append((int(ln), nm.group(1)))
    return by_file


def fix_file(path: Path, items: list[tuple[int, str]]) -> bool:
    lines = path.read_text().split('\n')
    changed = False
    for ln, name in items:
        idx = ln - 1
        if idx >= len(lines):
            continue
        original = lines[idx]
        # match `name:` or `name :`, possibly with public/private/static prefix.
        # only touch the first occurrence on the line, and only if no `!` or `?` already.
        new = re.sub(
            rf'(\b{re.escape(name)})(\s*:)',
            r'\1!\2',
            original,
            count=1,
        )
        # don't stamp twice
        if new != original and '!!' not in new:
            lines[idx] = new
            changed = True
    if changed:
        path.write_text('\n'.join(lines))
    return changed


def main():
    by_file = collect()
    if not by_file:
        print('no TS2564 errors')
        return 0
    n = 0
    for f, items in by_file.items():
        path = Path(f) if Path(f).is_absolute() else Path.cwd() / f
        if not path.exists():
            continue
        if fix_file(path, items):
            n += 1
            print(f'edited {path.relative_to(Path.cwd())}')
    print(f'\n{n} files edited')
    return 0


if __name__ == '__main__':
    sys.exit(main())
