"""
osv-scanner dependency scanner (Apache-2.0). Checks lockfiles in the PR
checkout against the free OSV.dev vulnerability database. The sparse
checkout only contains PR-touched files, so lockfiles are scanned exactly
when the PR changes them. Findings are file-level (no line numbers).
"""

import json
import logging
from pathlib import Path

from app.scanners.base import Scanner, ScanFinding

logger = logging.getLogger(__name__)

# osv-scanner exit codes: 0 = clean, 1 = vulnerabilities found,
# 128 = no supported lockfiles found (fine for non-dependency PRs).
_OK_EXIT_CODES = (0, 1, 128)

_MAX_VULNS_LISTED = 5


class OsvScanner(Scanner):
    name = "osv-scanner"
    label = "OSV-Scanner (dependencies)"
    binary = "osv-scanner"
    install_hint = "brew install osv-scanner"

    def run(self, repo_path: Path, files: list[str]) -> list[ScanFinding]:
        stdout = self._exec(
            ["osv-scanner", "--format", "json", "--recursive", "."],
            cwd=repo_path,
            ok_exit_codes=_OK_EXIT_CODES,
        )
        return _parse_results(stdout, repo_path)


def _parse_results(stdout: str, repo_path: Path) -> list[ScanFinding]:
    if not stdout.strip():
        return []
    results = json.loads(stdout).get("results") or []
    return [
        _lockfile_finding(source_result, repo_path)
        for source_result in results
        if source_result.get("packages")
    ]


def _lockfile_finding(source_result: dict, repo_path: Path) -> ScanFinding:
    lockfile = _relative_path(source_result.get("source", {}).get("path", ""), repo_path)
    vulnerable = [
        f"`{pkg['package']['name']}@{pkg['package'].get('version', '?')}`: "
        + ", ".join(v.get("id", "?") for v in pkg.get("vulnerabilities", [])[:3])
        for pkg in source_result["packages"]
    ]
    listed = vulnerable[:_MAX_VULNS_LISTED]
    if len(vulnerable) > len(listed):
        listed.append(f"…and {len(vulnerable) - len(listed)} more packages")
    return ScanFinding(
        scanner="osv-scanner",
        rule_id="known-vulnerabilities",
        message="Dependencies with known vulnerabilities (see https://osv.dev):\n"
                + "\n".join(f"- {entry}" for entry in listed),
        severity="HIGH",
        path=lockfile,
        line=None,
    )


def _relative_path(path: str, repo_path: Path) -> str:
    try:
        return str(Path(path).resolve().relative_to(repo_path.resolve()))
    except ValueError:
        return path
