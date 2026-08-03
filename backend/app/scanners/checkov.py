"""
Checkov IaC scanner (Apache-2.0). Finds misconfigurations in Terraform,
Kubernetes manifests, Dockerfiles, and similar. --soft-fail keeps the
exit code at 0 so findings are read from JSON, not inferred from rc.
"""

import json
import logging
from pathlib import Path

from app.scanners.base import Scanner, ScanFinding

logger = logging.getLogger(__name__)


class CheckovScanner(Scanner):
    name = "checkov"
    label = "Checkov (IaC)"
    binary = "checkov"
    install_hint = "pip install checkov  # or: brew install checkov"

    def run(self, repo_path: Path, files: list[str]) -> list[ScanFinding]:
        stdout = self._exec(
            ["checkov", "--directory", ".", "--output", "json",
             "--quiet", "--compact", "--soft-fail"],
            cwd=repo_path,
        )
        return _parse_output(stdout, set(files))


def _parse_output(stdout: str, changed_files: set[str]) -> list[ScanFinding]:
    if not stdout.strip():
        return []
    data = json.loads(stdout)
    # One framework returns a dict; several return a list of dicts.
    reports = data if isinstance(data, list) else [data]
    findings = []
    for report in reports:
        for check in report.get("results", {}).get("failed_checks", []):
            finding = _finding_from_check(check)
            if finding.path in changed_files:
                findings.append(finding)
    return findings


def _finding_from_check(check: dict) -> ScanFinding:
    line_range = check.get("file_line_range") or [None]
    return ScanFinding(
        scanner="checkov",
        rule_id=check.get("check_id", "unknown-check"),
        message=check.get("check_name", "").strip(),
        severity=(check.get("severity") or "MEDIUM").upper(),
        path=(check.get("file_path") or "").lstrip("/"),
        line=line_range[0],
    )
