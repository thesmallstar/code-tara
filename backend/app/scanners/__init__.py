"""
Registry of optional security scanners. All are free tools the user
installs themselves; every scanner is off by default per review.
"""

import logging
from pathlib import Path

from app.scanners.base import Scanner, ScanFinding
from app.scanners.checkov import CheckovScanner
from app.scanners.gitleaks import GitleaksScanner
from app.scanners.opengrep import OpengrepScanner
from app.scanners.osv import OsvScanner

logger = logging.getLogger(__name__)

SCANNERS: dict[str, Scanner] = {
    scanner.name: scanner
    for scanner in (
        OpengrepScanner(),
        GitleaksScanner(),
        OsvScanner(),
        CheckovScanner(),
    )
}


def list_scanners() -> list[dict]:
    return [scanner.describe() for scanner in SCANNERS.values()]


def run_scanners(names: list[str], repo_path: Path, files: list[str]) -> list[ScanFinding]:
    """Run the selected, available scanners. One scanner failing (or being
    uninstalled) never blocks the review or the other scanners."""
    findings: list[ScanFinding] = []
    for name in names:
        scanner = SCANNERS.get(name)
        if scanner is None:
            logger.warning("Unknown scanner requested: %s", name)
            continue
        if not scanner.is_available():
            logger.warning("Scanner %s selected but not available, skipping", name)
            continue
        findings.extend(_run_one(scanner, repo_path, files))
    return findings


def _run_one(scanner: Scanner, repo_path: Path, files: list[str]) -> list[ScanFinding]:
    try:
        results = scanner.run(repo_path, files)
        logger.info("Scanner %s: %d finding(s)", scanner.name, len(results))
        return results
    except Exception as exc:
        logger.warning("Scanner %s failed: %s", scanner.name, exc)
        return []
