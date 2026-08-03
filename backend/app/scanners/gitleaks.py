"""
Gitleaks secrets scanner (MIT). Uses filesystem mode (--no-git) because
the sparse checkout is a shallow clone. Secret values are never included
in finding messages — only the rule and location.
"""

import json
import logging
import tempfile
from pathlib import Path

from app.scanners.base import Scanner, ScanFinding

logger = logging.getLogger(__name__)


class GitleaksScanner(Scanner):
    name = "gitleaks"
    label = "Gitleaks (secrets)"
    binary = "gitleaks"
    install_hint = "brew install gitleaks"

    def run(self, repo_path: Path, files: list[str]) -> list[ScanFinding]:
        with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as report:
            report_path = report.name
        self._exec(
            [
                "gitleaks", "detect",
                "--source", ".",
                "--no-git",
                "--no-banner",
                "--report-format", "json",
                "--report-path", report_path,
                "--exit-code", "0",
            ],
            cwd=repo_path,
        )
        return _parse_report(report_path, set(files))


def _parse_report(report_path: str, changed_files: set[str]) -> list[ScanFinding]:
    try:
        leaks = json.loads(Path(report_path).read_text() or "[]")
    finally:
        Path(report_path).unlink(missing_ok=True)
    return [
        ScanFinding(
            scanner="gitleaks",
            rule_id=leak.get("RuleID", "secret"),
            message=f"Possible secret committed: {leak.get('Description', 'secret detected')}. "
                    "Rotate it and move it to a secret store.",
            severity="HIGH",
            path=leak.get("File"),
            line=leak.get("StartLine"),
        )
        for leak in leaks
        if leak.get("File") in changed_files
    ]
