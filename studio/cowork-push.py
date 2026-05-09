#!/usr/bin/env python3
"""
cowork-push.py — push the current working tree to GitHub.

The Cowork mount blocks the unlink/rename ops git relies on, so git can't
run directly inside the Game Dev folder. Workaround: keep a parallel mirror
of the working tree under /tmp (a regular Linux fs where git works), rsync
into it before each commit, then `git push` over HTTPS to github.com.

Hardening: after rsync, before commit, verify no tracked file shrank by
more than 50% since the last commit. The Cowork mount has a known bug
where files Claude edits via the host file tools can come back truncated
to bash. This check catches that and aborts before pushing corruption.

Usage:
    python3 studio/cowork-push.py "<commit message>"
    python3 studio/cowork-push.py "<commit message>" --allow-shrink
"""
import os
import sys
import shutil
import subprocess

OWNER = "J4Builds"
REPO_NAME = "cowork-gamedev"

REPO_PATH = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOKEN_PATH = os.path.join(REPO_PATH, "studio", ".github-token")
MIRROR_PATH = "/tmp/cowork-mirror"

# Paths NEVER copied to the mirror (so they never end up in commits).
EXCLUDE = [
    ".git",
    "studio/.github-token",
    "studio/cowork-commit.ps1",  # abandoned
    "node_modules",
    "dist",
    "build",
    ".vite",
    ".cache",
    ".env",
    ".DS_Store",
    "Thumbs.db",
    "*.log",
    "*.tmp",
    "*.bak",
    "test-write.txt",
]

SHRINK_RATIO_THRESHOLD = 0.5  # abort if a file drops below this fraction of its committed size


def run(args, cwd=None, check=True, capture=False):
    res = subprocess.run(
        args, cwd=cwd, check=False,
        stdout=subprocess.PIPE if capture else None,
        stderr=subprocess.PIPE if capture else None,
        text=True,
    )
    if check and res.returncode != 0:
        msg = res.stderr if capture and res.stderr else f"exit {res.returncode}"
        raise RuntimeError(f"{' '.join(args)} -> {msg}")
    return res


def committed_size(path, mirror):
    """Return size of `path` in HEAD's tree, or None if not tracked yet."""
    try:
        out = subprocess.run(
            ["git", "cat-file", "-s", f"HEAD:{path}"],
            cwd=mirror, capture_output=True, text=True, check=True,
        )
        return int(out.stdout.strip())
    except subprocess.CalledProcessError:
        return None


def check_shrinkage(mirror):
    """Walk the mirror, compare each file's size against HEAD. Return list of suspect files."""
    suspects = []
    for root, dirs, names in os.walk(mirror):
        if ".git" in dirs:
            dirs.remove(".git")
        for n in names:
            full = os.path.join(root, n)
            rel = os.path.relpath(full, mirror).replace(os.sep, "/")
            new_size = os.path.getsize(full)
            old_size = committed_size(rel, mirror)
            if old_size and new_size < old_size * SHRINK_RATIO_THRESHOLD:
                suspects.append((rel, old_size, new_size))
    return suspects


def main():
    args = list(sys.argv[1:])
    allow_shrink = False
    if "--allow-shrink" in args:
        args.remove("--allow-shrink")
        allow_shrink = True
    if not args or not args[0].strip():
        print('usage: cowork-push.py "<commit message>" [--allow-shrink]', file=sys.stderr)
        sys.exit(2)
    message = args[0]

    if not os.path.exists(TOKEN_PATH):
        print(f"error: token not found at {TOKEN_PATH}", file=sys.stderr)
        sys.exit(1)
    with open(TOKEN_PATH) as f:
        token = f.read().strip()

    repo_url = f"https://{OWNER}:{token}@github.com/{OWNER}/{REPO_NAME}.git"

    # ---- Init or refresh mirror ----
    needs_init = not os.path.isdir(os.path.join(MIRROR_PATH, ".git"))
    if needs_init:
        if os.path.exists(MIRROR_PATH):
            shutil.rmtree(MIRROR_PATH)
        os.makedirs(MIRROR_PATH)
        run(["git", "init", "-b", "main", "-q"], cwd=MIRROR_PATH)
        run(["git", "config", "user.name", "Claude (Cowork)"], cwd=MIRROR_PATH)
        run(["git", "config", "user.email", "claude+cowork@anthropic.com"], cwd=MIRROR_PATH)
        run(["git", "remote", "add", "origin", repo_url], cwd=MIRROR_PATH)
    else:
        run(["git", "remote", "set-url", "origin", repo_url], cwd=MIRROR_PATH)

    fetch = subprocess.run(
        ["git", "fetch", "origin", "main", "-q"],
        cwd=MIRROR_PATH, capture_output=True, text=True,
    )
    if fetch.returncode == 0:
        run(["git", "reset", "--hard", "origin/main", "-q"], cwd=MIRROR_PATH)

    # ---- Wipe mirror's working tree (preserve .git) ----
    for entry in os.listdir(MIRROR_PATH):
        if entry == ".git":
            continue
        full = os.path.join(MIRROR_PATH, entry)
        if os.path.isdir(full) and not os.path.islink(full):
            shutil.rmtree(full)
        else:
            os.remove(full)

    # ---- rsync source -> mirror with checksum (mount doesn't preserve mtime correctly) ----
    rsync_args = ["rsync", "-ac"]
    for ex in EXCLUDE:
        rsync_args += ["--exclude", ex]
    rsync_args += [REPO_PATH.rstrip("/") + "/", MIRROR_PATH.rstrip("/") + "/"]
    run(rsync_args)

    # ---- Verify nothing shrunk suspiciously ----
    suspects = check_shrinkage(MIRROR_PATH)
    if suspects and not allow_shrink:
        print("ABORTED: files shrunk >50% since last commit (possible mount truncation):", file=sys.stderr)
        for rel, old, new in suspects:
            print(f"  {rel}: {old} -> {new} bytes", file=sys.stderr)
        print("If intentional, re-run with --allow-shrink. Otherwise, rewrite affected", file=sys.stderr)
        print("files via bash heredoc and try again. See COWORK_INSTRUCTIONS.md.", file=sys.stderr)
        sys.exit(3)

    # ---- Stage + commit + push ----
    run(["git", "add", "-A"], cwd=MIRROR_PATH)
    diff = subprocess.run(
        ["git", "diff", "--cached", "--quiet"],
        cwd=MIRROR_PATH,
    )
    if diff.returncode == 0:
        print("no changes to commit")
        return

    run(["git", "commit", "-m", message, "-q"], cwd=MIRROR_PATH)
    sha = run(["git", "rev-parse", "--short", "HEAD"],
              cwd=MIRROR_PATH, capture=True).stdout.strip()

    push = subprocess.run(
        ["git", "push", "origin", "main"],
        cwd=MIRROR_PATH, capture_output=True, text=True,
    )
    if push.returncode != 0:
        print(f"push failed:\n{push.stderr}", file=sys.stderr)
        sys.exit(1)

    print(f"  -> {sha}  {message.splitlines()[0]}")
    print(f"  https://github.com/{OWNER}/{REPO_NAME}/commits/main")


if __name__ == "__main__":
    main()
