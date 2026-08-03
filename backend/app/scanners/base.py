"""
Scanner plugin framework.

Each scanner wraps a free, user-installed CLI security tool. Scanners are
opt-in per review, detected at runtime, and report install instructions
when their binary is missing. They run against the sparse PR checkout,
so they only ever see files the PR touches.
"""

import logging
import shutil
import subprocess
from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

SCAN_TIMEOUT = 300


@dataclass
class ScanFinding:
    scanner: str
    rule_id: str
    message: str
    severity: str            # HIGH | MEDIUM | LOW | INFO
    path: Optional[str]      # repo-relative; None = review-level finding
    line: Optional[int]      # None = file-level finding


class Scanner(ABC):
    name: str
    label: str
    binary: str
    install_hint: str

    def is_available(self) -> bool:
        return shutil.which(self.binary) is not None

    def describe(self) -> dict:
        return {
            "name": self.name,
            "label": self.label,
            "available": self.is_available(),
            "install_hint": self.install_hint,
        }

    @abstractmethod
    def run(self, repo_path: Path, files: list[str]) -> list[ScanFinding]:
        """Scan the checkout and return findings. `files` are the PR's
        repo-relative changed file paths."""

    def _exec(self, cmd: list[str], cwd: Path, ok_exit_codes: tuple = (0,)) -> str:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=SCAN_TIMEOUT,
            cwd=str(cwd),
        )
        if result.returncode not in ok_exit_codes:
            raise RuntimeError(
                f"{self.name} exited {result.returncode}: {result.stderr.strip()[:500]}"
            )
        return result.stdout


def existing_files(repo_path: Path, files: list[str]) -> list[str]:
    """Changed files that materialized in the sparse checkout (deleted
    files appear in the PR diff but not on disk)."""
    return [f for f in files if (repo_path / f).is_file()]
