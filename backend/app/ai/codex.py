"""
Codex CLI provider.
Shells out to `codex exec` (non-interactive mode).
Assumes the user has run `codex login` — no API key needed.
"""

import json
import logging
import subprocess
import tempfile
from pathlib import Path
from typing import Optional

from app.ai.base import AIProvider, ProviderRegistry
from app.ai.claude import (
    _parse_chunk_plan,
    _validate_and_anchor_comments,
)
from app.ai.prompts import get_prompt

logger = logging.getLogger(__name__)

_PLAN_CHUNKS_SCHEMA = {
    "type": "object",
    "properties": {
        "chunks": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "purpose": {"type": "string"},
                    "walkthrough": {"type": "string"},
                    "summary": {"type": "string"},
                    "files": {"type": "array", "items": {"type": "string"}},
                    "review_order": {"type": "array", "items": {"type": "string"}},
                },
                "required": ["title", "purpose", "walkthrough", "summary", "files", "review_order"],
                "additionalProperties": False,
            },
        },
    },
    "required": ["chunks"],
    "additionalProperties": False,
}

_CHUNK_REVIEW_SCHEMA = {
    "type": "object",
    "properties": {
        "assessment": {"type": "string"},
        "comments": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "path": {"type": "string"},
                    "line": {"type": "integer"},
                    "side": {"type": "string", "enum": ["RIGHT"]},
                    "body": {"type": "string"},
                },
                "required": ["path", "line", "side", "body"],
                "additionalProperties": False,
            },
        },
    },
    "required": ["assessment", "comments"],
    "additionalProperties": False,
}

_RE_REVIEW_SCHEMA = {
    "type": "object",
    "properties": {
        "changes_summary": {"type": "string"},
        "thread_opinions": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "github_id": {"type": "integer"},
                    "should_resolve": {"type": "boolean"},
                    "reason": {"type": "string"},
                },
                "required": ["github_id", "should_resolve", "reason"],
                "additionalProperties": False,
            },
        },
    },
    "required": ["changes_summary", "thread_opinions"],
    "additionalProperties": False,
}


def _run_codex(
    prompt: str,
    cwd: Optional[Path] = None,
    json_schema: Optional[dict] = None,
) -> str:
    """
    Run `codex exec` in non-interactive mode and return stdout.
    Uses read-only sandbox and ephemeral sessions.
    When json_schema is provided, writes it to a temp file and passes --output-schema.
    """
    cmd = ["codex", "exec", prompt, "-s", "read-only", "--ephemeral"]
    if cwd:
        cmd += ["-C", str(cwd)]

    schema_file = None
    try:
        if json_schema:
            schema_file = tempfile.NamedTemporaryFile(
                mode="w", suffix=".json", delete=False,
            )
            json.dump(json_schema, schema_file)
            schema_file.close()
            cmd += ["--output-schema", schema_file.name]

        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=300,
            )
        except FileNotFoundError:
            raise RuntimeError(
                "`codex` CLI not found. Install Codex: https://openai.com/codex"
            )

        if result.returncode != 0:
            logger.error(
                "codex exec failed (exit %d):\n%s",
                result.returncode, result.stderr.strip(),
            )
            raise RuntimeError(
                f"codex exec exited {result.returncode}: {result.stderr.strip()}"
            )

        if result.stderr.strip():
            logger.debug("codex stderr:\n%s", result.stderr.strip())

        output = result.stdout.strip()
        logger.debug("codex output (%d chars): %s…", len(output), output[:200])
        return output
    finally:
        if schema_file:
            Path(schema_file.name).unlink(missing_ok=True)


def _build_diff_context(file_diffs: dict[str, str]) -> str:
    parts = []
    for path, patch in file_diffs.items():
        parts.append(f"### File: {path}\n```diff\n{patch}\n```")
    return "\n\n".join(parts)


def _truncate_patch(patch: str, max_lines: int = 40) -> str:
    if not patch:
        return "(no diff)"
    lines = patch.splitlines()
    if len(lines) <= max_lines:
        return patch
    return "\n".join(lines[:max_lines]) + f"\n  … ({len(lines) - max_lines} more lines)"


@ProviderRegistry.register("codex", label="Codex")
class CodexProvider(AIProvider):
    def plan_chunks(
        self,
        pr_data: dict,
        files: list[dict],
        repo_path: Optional[Path] = None,
    ) -> list[dict]:
        file_context = "\n\n".join(
            f"### {f['filename']}  (+{f.get('additions',0)}/-{f.get('deletions',0)}, status: {f.get('status','modified')})\n"
            f"```diff\n{_truncate_patch(f.get('patch',''))}\n```"
            for f in files
        )
        repo_note = (
            f"\nRepository is checked out at {repo_path} — you may read files for additional context.\n"
            if repo_path else ""
        )
        prompt = (
            f"{get_prompt('plan_chunks')}\n\nReturn ONLY valid JSON — no other text, no markdown fences.{repo_note}\n\n"
            f"PR: {pr_data.get('title','')}\n"
            f"Description: {pr_data.get('body') or '(none)'}\n\n"
            f"Changed files ({len(files)}):\n\n{file_context}"
        )
        raw = _run_codex(prompt, cwd=repo_path, json_schema=_PLAN_CHUNKS_SCHEMA)
        return _parse_chunk_plan(raw, files)

    def summarize_pr(
        self,
        pr_data: dict,
        files: list[dict],
        repo_path: Optional[Path] = None,
    ) -> str:
        file_list = "\n".join(
            f"- {f['filename']} (+{f.get('additions',0)}/-{f.get('deletions',0)})"
            for f in files
        )
        repo_note = (
            f"\nThe repository is available at: {repo_path}\nFeel free to read the changed files for full context.\n"
            if repo_path else ""
        )
        prompt = (
            f"{get_prompt('pr_summary')}{repo_note}\n\n"
            f"PR Title: {pr_data.get('title', '')}\n\n"
            f"PR Description:\n{pr_data.get('body') or '(no description)'}\n\n"
            f"Files changed ({len(files)}):\n{file_list}"
        )
        return _run_codex(prompt, cwd=repo_path)

    def review_chunk(
        self,
        chunk_title: str,
        file_diffs: dict[str, str],
        line_map: dict,
        repo_path: Optional[Path] = None,
    ) -> dict:
        diff_ctx = _build_diff_context(file_diffs)
        commentable = {path: sorted(lines) for path, lines in line_map.items() if lines}
        repo_note = (
            f"\nThe repository is checked out at: {repo_path}\nYou can read any file for additional context.\n"
            if repo_path else ""
        )
        prompt = (
            f"{get_prompt('chunk_review')}\n\nRespond ONLY with valid JSON. Return ONLY the JSON object, no other text.{repo_note}\n\n"
            f"Chunk: {chunk_title}\n\n"
            f"Commentable lines per file (only comment on these): {json.dumps(commentable)}\n\n"
            f"Diffs:\n{diff_ctx}"
        )
        raw = _run_codex(prompt, cwd=repo_path, json_schema=_CHUNK_REVIEW_SCHEMA)
        try:
            result = json.loads(raw)
        except (json.JSONDecodeError, AttributeError):
            logger.warning("Failed to parse review JSON (%d chars): %s…", len(raw), raw[:200])
            result = {"assessment": raw, "comments": []}
        return _validate_and_anchor_comments(result, line_map)

    def chat(
        self,
        chunk_context: str,
        messages: list[dict],
        repo_path: Optional[Path] = None,
    ) -> str:
        history = "\n".join(
            f"[{m['role'].capitalize()}]: {m['content']}" for m in messages
        )
        repo_note = (
            f"\nRepository is available at: {repo_path} — read files if helpful.\n"
            if repo_path else ""
        )
        prompt = (
            f"{get_prompt('chat')}{repo_note}\n\n"
            f"Chunk diff context:\n{chunk_context}\n\n"
            f"Conversation so far:\n{history}\n\n"
            f"[Assistant]:"
        )
        return _run_codex(prompt, cwd=repo_path)

    def re_review(
        self,
        pr_data: dict,
        diff_files: list[dict],
        root_threads: list[dict],
        issue_comments: list[dict],
    ) -> dict:
        diff_ctx = _build_diff_context(
            {f["filename"]: f.get("patch", "") for f in diff_files}
        ) if diff_files else "No new commits since the last review."

        threads_ctx = ""
        if root_threads:
            parts = []
            for t in root_threads:
                loc = f"{t.get('path', '')}:{t.get('line', '')}" if t.get("path") else "general"
                parts.append(
                    f"[github_id={t['id']}] {t.get('user',{}).get('login','?')} at {loc}:\n{t.get('body','')[:300]}"
                )
            threads_ctx = "\n\n".join(parts)
        else:
            threads_ctx = "No open review threads."

        issue_ctx = "\n\n".join(
            f"{c.get('user',{}).get('login','?')}: {c.get('body','')[:200]}"
            for c in issue_comments
        ) or "None."

        prompt = f"""\
{get_prompt('re_review')}

PR: {pr_data.get('title','')}
Description: {pr_data.get('body') or '(none)'}

NEW CHANGES SINCE LAST REVIEW:
{diff_ctx}

OPEN REVIEW THREADS (inline comments from reviewers):
{threads_ctx}

GENERAL PR DISCUSSION COMMENTS:
{issue_ctx}

Return ONLY valid JSON matching the schema."""

        raw = _run_codex(prompt, json_schema=_RE_REVIEW_SCHEMA)
        try:
            return json.loads(raw)
        except (json.JSONDecodeError, AttributeError):
            return {"changes_summary": raw, "thread_opinions": []}
