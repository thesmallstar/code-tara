"""Unit tests for the scanner framework: output parsing, changed-file
filtering, diff anchoring, and graceful degradation."""

import json

import pytest

from app.reviews.service import _anchor_finding_line, _format_finding
from app.scanners import SCANNERS, run_scanners
from app.scanners.base import ScanFinding
from app.scanners.checkov import _parse_output as parse_checkov
from app.scanners.gitleaks import _parse_report as parse_gitleaks
from app.scanners.opengrep import _parse_results as parse_opengrep
from app.scanners.opengrep import _rules_dir_for
from app.scanners.osv import _parse_results as parse_osv


class TestOpengrepParsing:
    def test_parses_findings_with_severity_mapping(self):
        stdout = json.dumps({
            "results": [{
                "check_id": "python.django.security.injection.sql",
                "path": "app/views.py",
                "start": {"line": 42},
                "extra": {"message": "Possible SQL injection", "severity": "ERROR"},
            }]
        })
        findings = parse_opengrep(stdout)
        assert len(findings) == 1
        assert findings[0].path == "app/views.py"
        assert findings[0].line == 42
        assert findings[0].severity == "HIGH"

    def test_empty_results(self):
        assert parse_opengrep(json.dumps({"results": []})) == []

    def test_rules_dir_mapping(self):
        assert _rules_dir_for("app/main.py") == "python"
        assert _rules_dir_for("web/App.tsx") == "typescript"
        assert _rules_dir_for("Dockerfile") == "dockerfile"
        assert _rules_dir_for("infra/main.tf") == "terraform"
        assert _rules_dir_for("README.md") == ""


class TestGitleaksParsing:
    def _report(self, tmp_path, leaks):
        report = tmp_path / "report.json"
        report.write_text(json.dumps(leaks))
        return str(report)

    def test_finding_excludes_secret_value(self, tmp_path):
        leaks = [{
            "RuleID": "aws-access-key",
            "Description": "AWS access key",
            "File": "app/config.py",
            "StartLine": 7,
            "Secret": "AKIA-REAL-SECRET",
        }]
        findings = parse_gitleaks(self._report(tmp_path, leaks), {"app/config.py"})
        assert len(findings) == 1
        assert "AKIA-REAL-SECRET" not in findings[0].message
        assert findings[0].severity == "HIGH"

    def test_filters_to_changed_files(self, tmp_path):
        leaks = [{"RuleID": "x", "File": "unchanged.py", "StartLine": 1}]
        assert parse_gitleaks(self._report(tmp_path, leaks), {"other.py"}) == []


class TestCheckovParsing:
    _check = {
        "check_id": "CKV_AWS_20",
        "check_name": "Ensure S3 bucket is not public",
        "file_path": "/infra/s3.tf",
        "file_line_range": [3, 12],
        "severity": None,
    }

    def test_dict_output(self):
        stdout = json.dumps({"results": {"failed_checks": [self._check]}})
        findings = parse_checkov(stdout, {"infra/s3.tf"})
        assert len(findings) == 1
        assert findings[0].path == "infra/s3.tf"
        assert findings[0].line == 3
        assert findings[0].severity == "MEDIUM"  # null severity defaults

    def test_list_output_and_filtering(self):
        stdout = json.dumps([{"results": {"failed_checks": [self._check]}}])
        assert parse_checkov(stdout, {"infra/s3.tf"}) != []
        assert parse_checkov(stdout, {"other.tf"}) == []

    def test_empty_output(self):
        assert parse_checkov("", {"a.tf"}) == []


class TestOsvParsing:
    def test_aggregates_per_lockfile(self, tmp_path):
        stdout = json.dumps({
            "results": [{
                "source": {"path": str(tmp_path / "uv.lock")},
                "packages": [{
                    "package": {"name": "django", "version": "3.0"},
                    "vulnerabilities": [{"id": "GHSA-xxxx"}, {"id": "CVE-2024-1"}],
                }],
            }]
        })
        findings = parse_osv(stdout, tmp_path)
        assert len(findings) == 1
        assert findings[0].path == "uv.lock"
        assert findings[0].line is None
        assert "django@3.0" in findings[0].message

    def test_empty_output(self, tmp_path):
        assert parse_osv("", tmp_path) == []


class TestAnchoring:
    line_maps = {"app/views.py": [10, 11, 12], "uv.lock": [1, 2]}

    def _finding(self, path, line):
        return ScanFinding("opengrep", "rule", "msg", "HIGH", path, line)

    def test_exact_changed_line_kept(self):
        assert _anchor_finding_line(self.line_maps, self._finding("app/views.py", 11)) == 11

    def test_unchanged_line_dropped(self):
        assert _anchor_finding_line(self.line_maps, self._finding("app/views.py", 99)) is None

    def test_file_level_anchors_to_first_commentable(self):
        assert _anchor_finding_line(self.line_maps, self._finding("uv.lock", None)) == 1

    def test_unknown_file_dropped(self):
        assert _anchor_finding_line(self.line_maps, self._finding("nope.py", 1)) is None


class TestRunScanners:
    def test_unknown_scanner_skipped(self, tmp_path):
        assert run_scanners(["not-a-scanner"], tmp_path, []) == []

    def test_unavailable_scanner_skipped(self, tmp_path, monkeypatch):
        scanner = SCANNERS["gitleaks"]
        monkeypatch.setattr(type(scanner), "is_available", lambda self: False)
        assert run_scanners(["gitleaks"], tmp_path, ["a.py"]) == []

    def test_scanner_failure_does_not_block_others(self, tmp_path, monkeypatch):
        broken, working = SCANNERS["gitleaks"], SCANNERS["checkov"]
        monkeypatch.setattr(type(broken), "is_available", lambda self: True)
        monkeypatch.setattr(type(working), "is_available", lambda self: True)
        monkeypatch.setattr(type(broken), "run", lambda self, r, f: (_ for _ in ()).throw(RuntimeError("boom")))
        ok = [ScanFinding("checkov", "CKV_1", "msg", "LOW", "a.tf", 1)]
        monkeypatch.setattr(type(working), "run", lambda self, r, f: ok)
        assert run_scanners(["gitleaks", "checkov"], tmp_path, ["a.tf"]) == ok


class TestFormatFinding:
    def test_body_includes_scanner_rule_and_severity(self):
        body = _format_finding(ScanFinding("opengrep", "py.sql-injection", "Bad query", "HIGH", "a.py", 1))
        assert body.startswith("**[opengrep]**")
        assert "py.sql-injection" in body
        assert "HIGH" in body
        assert "Bad query" in body
