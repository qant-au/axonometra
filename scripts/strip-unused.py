#!/usr/bin/env python3
"""
One-shot helper for Stage 4.3a — strip TS6133 / TS6192 / TS7031 errors
mechanically. Parses `npx tsc --noEmit` output, removes unused named imports,
deletes fully-unused import lines, and underscore-prefixes unused locals /
params (TS treats `_`-prefixed identifiers as exempt from
noUnusedLocals/Parameters).

Run from the repo root. Idempotent.
"""
from __future__ import annotations

import re
import subprocess
import sys
from collections import defaultdict
from pathlib import Path


def collect_errors():
    p = subprocess.run(
        ['npx', 'tsc', '--noEmit'],
        capture_output=True, text=True, cwd='.', check=False,
    )
    out = (p.stdout or '') + (p.stderr or '')
    by_file: dict[str, list[tuple[int, int, str, str]]] = defaultdict(list)
    for line in out.splitlines():
        m = re.match(r'(.+?)\((\d+),(\d+)\): error (TS\d+): (.+)', line)
        if not m:
            continue
        path, ln, col, code, msg = m.groups()
        if code not in ('TS6133', 'TS6192', 'TS7031'):
            continue
        by_file[path].append((int(ln), int(col), code, msg))
    return by_file


def strip_named_import(src: str, name: str) -> tuple[str, bool]:
    """Remove `name` from any `import { ... } from '...'` declaration.
    Returns (new_src, changed)."""
    pattern = re.compile(
        r'(import\s*\{)([^}]*)(\}\s*from\s*[\'"][^\'"]+[\'"];?)',
        re.MULTILINE,
    )

    def rewrite(m: re.Match[str]) -> str:
        head, body, tail = m.group(1), m.group(2), m.group(3)
        parts = [p.strip() for p in body.split(',') if p.strip()]
        kept = [p for p in parts if p.split(' as ')[0].strip() != name]
        if not kept:
            return ''  # signal removal of the whole line via cleanup pass
        return f'{head} {", ".join(kept)} {tail}'

    out = pattern.sub(rewrite, src)
    # cleanup: remove blank lines we just produced where an import vanished
    cleaned = '\n'.join(
        ln for ln in out.splitlines() if not (ln == '' and ln != ln)
    )
    return out, out != src


def underscore_local(src: str, line_idx: int, name: str) -> tuple[str, bool]:
    """Prefix the first occurrence of `name` on the given line with `_`."""
    lines = src.split('\n')
    if line_idx >= len(lines):
        return src, False
    original = lines[line_idx]
    new = re.sub(rf'\b{re.escape(name)}\b', f'_{name}', original, count=1)
    if new == original:
        return src, False
    lines[line_idx] = new
    return '\n'.join(lines), True


def process_file(path: Path, errors: list[tuple[int, int, str, str]]) -> bool:
    src = path.read_text()
    changed = False

    # TS6192 — drop entire import lines (do this first by line, descending)
    line_drops = sorted(
        {ln for ln, _, code, _ in errors if code == 'TS6192'}, reverse=True
    )
    if line_drops:
        lines = src.split('\n')
        for ln in line_drops:
            idx = ln - 1
            if 0 <= idx < len(lines):
                lines[idx] = ''  # mark for removal
        src = '\n'.join(lines)
        changed = True

    # TS6133 — could be import or local; try import strip first, fall back to underscore
    for ln, col, code, msg in errors:
        if code != 'TS6133':
            continue
        m = re.search(r"'([^']+)' is declared but its value is never read", msg)
        if not m:
            continue
        name = m.group(1)
        new_src, did = strip_named_import(src, name)
        if did:
            src = new_src
            changed = True
            continue
        # fall back: underscore-prefix on the indicated line
        new_src, did = underscore_local(src, ln - 1, name)
        if did:
            src = new_src
            changed = True

    # TS7031 — single instance: `setter` binding element implicit any.
    # The script doesn't try to type these; left for hand-fix.

    # collapse multiple blank lines from removed imports → single blank
    src = re.sub(r'\n{3,}', '\n\n', src)

    if changed:
        path.write_text(src)
    return changed


def main():
    by_file = collect_errors()
    if not by_file:
        print('no TS6133/6192/7031 errors')
        return 0
    touched = 0
    for path_str, errs in by_file.items():
        path = Path(path_str)
        if not path.is_absolute():
            path = Path.cwd() / path
        if not path.exists():
            print(f'SKIP missing: {path}')
            continue
        if process_file(path, errs):
            touched += 1
            print(f'edited {path.relative_to(Path.cwd())}')
    print(f'\n{touched} files edited')
    return 0


if __name__ == '__main__':
    sys.exit(main())
