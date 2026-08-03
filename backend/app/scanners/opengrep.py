"""
Opengrep SAST scanner (LGPL-2.1 engine).

Rules are user-supplied via OPENGREP_RULES_PATH — a clone of
github.com/opengrep/opengrep-rules. The rules carry a Commons Clause
condition, so they are never vendored into this repo; users clone them
separately. Only rule directories matching the PR's changed languages
run, keeping scans fast and findings relevant.
"""

import json
import logging
import os
from pathlib import Path

from app.scanners.base import Scanner, ScanFinding, existing_files

logger = logging.getLogger(__name__)

DEFAULT_RULES_PATH = "~/opengrep-rules"

_EXT_TO_RULES_DIR = {
    ".py": "python",
    ".js": "javascript",
    ".jsx": "javascript",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".go": "go",
    ".java": "java",
    ".kt": "kotlin",
    ".rb": "ruby",
    ".rs": "rust",
    ".php": "php",
    ".c": "c",
    ".h": "c",
    ".cs": "csharp",
    ".scala": "scala",
    ".sh": "bash",
    ".swift": "swift",
    ".tf": "terraform",
    ".yaml": "yaml",
    ".yml": "yaml",
    ".html": "html",
}

_SEVERITY = {"ERROR": "HIGH", "WARNING": "MEDIUM", "INFO": "LOW"}


def rules_path() -> Path:
    return Path(os.getenv("OPENGREP_RULES_PATH", DEFAULT_RULES_PATH)).expanduser()


def _rules_dir_for(filename: str) -> str:
    name = filename.rsplit("/", 1)[-1].lower()
    if name == "dockerfile" or name.startswith("dockerfile."):
        return "dockerfile"
    return _EXT_TO_RULES_DIR.get(Path(filename).suffix.lower(), "")


def _rule_dirs(files: list[str]) -> list[Path]:
    base = rules_path()
    wanted = {d for f in files if (d := _rules_dir_for(f))}
    return [base / d for d in sorted(wanted) if (base / d).is_dir()]


class OpengrepScanner(Scanner):
    name = "opengrep"
    label = "Opengrep (SAST)"
    binary = "opengrep"
    install_hint = (
        "curl -fsSL https://raw.githubusercontent.com/opengrep/opengrep/main/install.sh | bash\n"
        "git clone https://github.com/opengrep/opengrep-rules ~/opengrep-rules\n"
        "Set OPENGREP_RULES_PATH if you clone the rules elsewhere."
    )

    def is_available(self) -> bool:
        return super().is_available() and rules_path().is_dir()

    def run(self, repo_path: Path, files: list[str]) -> list[ScanFinding]:
        targets = existing_files(repo_path, files)
        rule_dirs = _rule_dirs(targets)
        if not targets or not rule_dirs:
            return []
        cmd = ["opengrep", "scan", "--json", "--quiet"]
        for rules in rule_dirs:
            cmd += ["--config", str(rules)]
        stdout = self._exec(cmd + targets, cwd=repo_path)
        return _parse_results(stdout)


def _parse_results(stdout: str) -> list[ScanFinding]:
    results = json.loads(stdout).get("results", [])
    return [
        ScanFinding(
            scanner="opengrep",
            rule_id=r.get("check_id", "unknown-rule"),
            message=r.get("extra", {}).get("message", "").strip(),
            severity=_SEVERITY.get(r.get("extra", {}).get("severity", ""), "MEDIUM"),
            path=r.get("path"),
            line=r.get("start", {}).get("line"),
        )
        for r in results
    ]
