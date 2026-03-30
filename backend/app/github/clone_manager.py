"""
Manages sparse clones of GitHub repos for PR reviews.

Each review gets its own sparse clone at repos/<owner>/<repo>-pr-<number>/
containing only the files touched by the PR. Clones are shallow (--depth 1)
and checked out to the PR branch via pull/<number>/head.

On re-review or chat, we git-pull to pick up new commits.
Users can clean up disk space from the UI.
"""

import logging
import shutil
import subprocess
import threading
from pathlib import Path

logger = logging.getLogger(__name__)

REPOS_DIR = Path(__file__).resolve().parent.parent.parent.parent / "repos"
CLONE_TIMEOUT = 300


def _stream(pipe, log_fn):
    try:
        for line in iter(pipe.readline, ""):
            stripped = line.rstrip()
            if stripped:
                log_fn(stripped)
    finally:
        pipe.close()


def _run(cmd: list[str], cwd: Path = None, timeout: int = CLONE_TIMEOUT) -> tuple[int, str]:
    label = " ".join(str(c) for c in cmd)
    logger.info("$ %s", label)

    proc = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        cwd=str(cwd) if cwd else None,
    )

    stderr_lines: list[str] = []

    def capture_stderr(pipe):
        try:
            for line in iter(pipe.readline, ""):
                stripped = line.rstrip()
                if stripped:
                    stderr_lines.append(stripped)
                    logger.info("  [git] %s", stripped)
        finally:
            pipe.close()

    t_out = threading.Thread(target=_stream, args=(proc.stdout, lambda l: logger.info("  [git] %s", l)))
    t_err = threading.Thread(target=capture_stderr, args=(proc.stderr,))
    t_out.start()
    t_err.start()

    try:
        proc.wait(timeout=timeout)
    except subprocess.TimeoutExpired:
        proc.kill()
        t_out.join(timeout=2)
        t_err.join(timeout=2)
        raise RuntimeError(f"Command timed out after {timeout}s: {label}")

    t_out.join()
    t_err.join()
    return proc.returncode, "\n".join(stderr_lines)


def _repo_path(owner: str, repo: str, pr_number: int) -> Path:
    return REPOS_DIR / owner / f"{repo}-pr-{pr_number}"


def ensure_repo(owner: str, repo: str, pr_number: int,
                pr_files: list[str] = None) -> Path:
    """
    Sparse-clone the PR branch, or pull if it already exists.

    First call: shallow clone + fetch PR ref + sparse-checkout PR files.
    Subsequent calls: git pull to pick up new commits.
    """
    REPOS_DIR.mkdir(exist_ok=True)
    owner_dir = REPOS_DIR / owner
    owner_dir.mkdir(exist_ok=True)

    repo_path = _repo_path(owner, repo, pr_number)

    if repo_path.exists():
        logger.info("Clone exists at %s, pulling latest", repo_path)
        _run(["git", "pull", "--depth", "1", "-q"], cwd=repo_path)
        return repo_path

    # Fresh sparse clone
    logger.info("Sparse-cloning %s/%s PR #%d", owner, repo, pr_number)

    rc, err = _run([
        "gh", "repo", "clone", f"{owner}/{repo}", str(repo_path),
        "--", "--depth", "1", "--no-tags", "--no-checkout",
    ])
    if rc != 0:
        raise RuntimeError(f"Clone failed (exit {rc}):\n{err}")

    # Fetch the PR branch
    pr_ref = f"pull/{pr_number}/head"
    rc, err = _run(
        ["git", "fetch", "--depth", "1", "origin", f"{pr_ref}:pr-head"],
        cwd=repo_path,
    )
    if rc != 0:
        raise RuntimeError(f"Failed to fetch PR #{pr_number} (exit {rc}):\n{err}")

    _run(["git", "checkout", "pr-head"], cwd=repo_path)

    # Sparse-checkout only PR files
    if pr_files:
        _run(["git", "sparse-checkout", "set", "--no-cone"] + pr_files, cwd=repo_path)
        logger.info("Sparse checkout: %d files", len(pr_files))

    logger.info("Repo ready at %s", repo_path)
    return repo_path



def cleanup_pr(owner: str, repo: str, pr_number: int) -> None:
    """Remove a specific PR's clone."""
    repo_path = _repo_path(owner, repo, pr_number)
    if repo_path.exists():
        shutil.rmtree(repo_path, ignore_errors=True)
        logger.info("Cleaned up %s", repo_path)


def cleanup_all() -> dict:
    """Remove all cloned repos. Returns disk space freed info."""
    if not REPOS_DIR.exists():
        return {"deleted": 0, "path": str(REPOS_DIR)}

    count = 0
    for owner_dir in REPOS_DIR.iterdir():
        if not owner_dir.is_dir():
            continue
        for clone_dir in owner_dir.iterdir():
            if clone_dir.is_dir():
                shutil.rmtree(clone_dir, ignore_errors=True)
                count += 1
        # Remove empty owner dirs
        if not any(owner_dir.iterdir()):
            owner_dir.rmdir()

    logger.info("Cleaned up %d cloned repos", count)
    return {"deleted": count, "path": str(REPOS_DIR)}


def disk_usage() -> dict:
    """Get disk usage info for all clones."""
    if not REPOS_DIR.exists():
        return {"total_bytes": 0, "repos": []}

    repos = []
    total = 0
    for owner_dir in REPOS_DIR.iterdir():
        if not owner_dir.is_dir():
            continue
        for clone_dir in owner_dir.iterdir():
            if not clone_dir.is_dir():
                continue
            size = sum(f.stat().st_size for f in clone_dir.rglob("*") if f.is_file())
            repos.append({
                "path": f"{owner_dir.name}/{clone_dir.name}",
                "bytes": size,
            })
            total += size

    return {"total_bytes": total, "repos": repos}
