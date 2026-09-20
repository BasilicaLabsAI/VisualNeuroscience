#!/usr/bin/env python3
"""Create a GitHub release for every version in docs/RELEASES.md that has a
tag on the remote but no release yet, titled and described from the ledger.
Needs the gh command and a token in GH_TOKEN; run after scripts/push_tags.sh."""
import json, re, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HEAD = re.compile(r"^## (v[0-9.]+) — (.*?) — (.*)$")

def ledger():
    """(version, title, description) for every entry, newest first"""
    out, ver, title, body = [], None, None, []
    for line in (ROOT / "docs" / "RELEASES.md").read_text(encoding="utf-8").splitlines():
        m = HEAD.match(line)
        if m:
            if ver: out.append((ver, title, "\n".join(body).strip()))
            ver, title, body = m.group(1), m.group(3), []
        elif ver and not line.startswith("Commit"):
            body.append(line)
    if ver: out.append((ver, title, "\n".join(body).strip()))
    return out

def gh(*args, **kw):
    return subprocess.run(["gh", *args], text=True, capture_output=True, **kw)

def main():
    r = gh("release", "list", "--limit", "500", "--json", "tagName")
    if r.returncode: sys.exit("gh release list failed: " + r.stderr.strip())
    have = {x["tagName"] for x in json.loads(r.stdout or "[]")}
    tags = set(subprocess.run(["git", "ls-remote", "--tags", "origin"], text=True, capture_output=True).stdout.split())
    tags = {t.rsplit("/", 1)[-1] for t in tags if t.startswith("refs/tags/") and not t.endswith("^{}")}
    made = []
    for ver, title, desc in reversed(ledger()):
        if ver in have or ver not in tags: continue
        r = gh("release", "create", ver, "--verify-tag", "--title", f"{ver} — {title}", "--notes", desc or title)
        if r.returncode: print(f"{ver}: {r.stderr.strip()}", file=sys.stderr)
        else: made.append(ver)
    print("Releases created: " + (" ".join(made) if made else "none; every tag already has one"))

if __name__ == "__main__":
    main()
