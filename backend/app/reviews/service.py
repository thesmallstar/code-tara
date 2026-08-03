"""
Core business logic for creating and processing review instances.
Runs as a synchronous background task (called from FastAPI BackgroundTasks).
"""

import json
import logging
import re
from datetime import datetime

from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.github.client import GitHubClient, get_github_token
from app.github.clone_manager import ensure_repo
from app.github.diff_parser import build_line_maps
from app.models import (
    DraftComment,
    PullRequest,
    ReviewChunk,
    ReviewInstance,
    ReviewThread,
)
from app.reviews.chunker import create_chunks  # kept as fallback
from app.ai import ProviderRegistry
from app.scanners import run_scanners

logger = logging.getLogger(__name__)

PR_URL_RE = re.compile(
    r"https?://github\.com/(?P<owner>[^/]+)/(?P<repo>[^/]+)/pull/(?P<number>\d+)"
)


def parse_pr_url(url: str) -> tuple[str, str, int]:
    m = PR_URL_RE.match(url.strip())
    if not m:
        raise ValueError(f"Invalid GitHub PR URL: {url}")
    return m.group("owner"), m.group("repo"), int(m.group("number"))


def get_ai_provider(model_provider: str):
    return ProviderRegistry.create(model_provider)


def _set_status(db: Session, review: ReviewInstance, status: str, error: str = None):
    review.status = status
    if error:
        review.error_message = error
    db.commit()


def process_review(review_id: int) -> None:
    """
    Full pipeline: fetch PR → summarize → chunk → AI review per chunk.
    Runs in FastAPI's background task thread pool (sync).
    """
    db: Session = SessionLocal()
    try:
        _run_pipeline(db, review_id)
    except Exception as exc:
        logger.exception("Review pipeline failed for review_id=%s", review_id)
        db.rollback()
        try:
            review = db.get(ReviewInstance, review_id)
            if review:
                _set_status(db, review, "ERROR", str(exc))
        except Exception:
            pass
    finally:
        db.close()


def _run_pipeline(db: Session, review_id: int) -> None:
    review = db.get(ReviewInstance, review_id)
    if not review:
        return

    pr = db.get(PullRequest, review.pull_request_id)
    if not pr:
        _set_status(db, review, "ERROR", "Associated PR record not found")
        return

    token = get_github_token()
    if not token:
        _set_status(db, review, "ERROR", "GitHub token not found. Set GITHUB_TOKEN env or run `gh auth login`.")
        return

    gh = GitHubClient(token)

    # ── 1. Sync PR metadata ────────────────────────────────────────────────
    _set_status(db, review, "SYNCING")

    try:
        pr_data = gh.get_pull_request(pr.owner, pr.repo, pr.pr_number)
        files_data = gh.get_pull_request_files(pr.owner, pr.repo, pr.pr_number)
        review_comments = gh.get_review_comments(pr.owner, pr.repo, pr.pr_number)
        issue_comments = gh.get_issue_comments(pr.owner, pr.repo, pr.pr_number)
    except Exception as e:
        _set_status(db, review, "ERROR", f"GitHub fetch failed: {e}")
        return

    pr.title = pr_data.get("title")
    pr.body = pr_data.get("body")
    pr.author = pr_data.get("user", {}).get("login")
    pr.head_sha = pr_data.get("head", {}).get("sha")
    pr.base_sha = pr_data.get("base", {}).get("sha")
    pr.last_synced_at = datetime.utcnow()
    pr.pr_state = "merged" if pr_data.get("merged") else pr_data.get("state", "open")
    try:
        pr.review_decision = gh.get_pull_request_review_decision(pr.owner, pr.repo, pr.pr_number)
    except Exception:
        pr.review_decision = None
    db.commit()

    # ── 1b. Sparse-clone PR files so AI can read source ──────────────────
    pr_files = [f["filename"] for f in files_data if f.get("filename")]
    repo_path = None
    try:
        repo_path = ensure_repo(
            pr.owner, pr.repo,
            pr_number=pr.pr_number,
            pr_files=pr_files,
        )
        logger.info("Repo available at %s", repo_path)
    except Exception as e:
        logger.warning("Could not clone repo (AI will work from diff only): %s", e)

    # Store existing threads (clear old ones for this review instance first)
    db.query(ReviewThread).filter(ReviewThread.review_instance_id == review_id).delete()
    for c in review_comments:
        db.add(ReviewThread(
            review_instance_id=review_id,
            github_id=c.get("id"),
            type="REVIEW_COMMENT",
            author=c.get("user", {}).get("login"),
            body=c.get("body", ""),
            path=c.get("path"),
            line=c.get("line") or c.get("original_line"),
            position=c.get("position"),   # None = comment is on outdated diff
            diff_hunk=c.get("diff_hunk"),
            created_at=_parse_dt(c.get("created_at")),
            in_reply_to_id=c.get("in_reply_to_id"),
        ))
    for c in issue_comments:
        db.add(ReviewThread(
            review_instance_id=review_id,
            github_id=c.get("id"),
            type="ISSUE_COMMENT",
            author=c.get("user", {}).get("login"),
            body=c.get("body", ""),
            created_at=_parse_dt(c.get("created_at")),
        ))
    db.commit()

    # ── 2. Summarize ────────────────────────────────────────────────────────
    _set_status(db, review, "SUMMARIZING")
    try:
        ai = get_ai_provider(review.model_provider)
        summary = ai.summarize_pr(pr_data, files_data, repo_path=repo_path)
        review.summary_md = summary
        db.commit()
    except Exception as e:
        logger.warning("PR summary failed: %s", e)
        review.summary_md = f"_Summary generation failed: {e}_"
        db.commit()

    # ── 3. LLM plans the chunk structure ────────────────────────────────────
    _set_status(db, review, "CHUNKING")
    line_maps = build_line_maps(files_data)
    file_map = {f["filename"]: f for f in files_data}

    ai = get_ai_provider(review.model_provider)
    try:
        logger.info("Asking tara to plan review chunks…")
        chunk_plans = ai.plan_chunks(pr_data, files_data, repo_path=repo_path)
        logger.info("tara planned %d chunks", len(chunk_plans))
    except Exception as e:
        logger.warning("LLM chunk planning failed (%s), falling back to heuristic", e)
        # Fallback: use heuristic chunker, minimal metadata
        raw_fallback = create_chunks(files_data)
        chunk_plans = [
            {
                "title": r["title"],
                "purpose": "",
                "walkthrough": "",
                "summary": "",
                "files": r["files"],
                "review_order": r["files"],
            }
            for r in raw_fallback
        ]

    # Clear existing chunks for this review
    db.query(ReviewChunk).filter(ReviewChunk.review_instance_id == review_id).delete()
    db.commit()

    chunk_records = []
    for idx, plan in enumerate(chunk_plans):
        file_paths = plan.get("files", [])
        file_diffs = {p: file_map.get(p, {}).get("patch", "") for p in file_paths}
        chunk_line_map = {p: line_maps.get(p, []) for p in file_paths}

        chunk = ReviewChunk(
            review_instance_id=review_id,
            order_index=idx,
            title=plan.get("title", f"Chunk {idx + 1}"),
            purpose=plan.get("purpose", ""),
            walkthrough=plan.get("walkthrough", ""),
            chunk_summary=plan.get("summary", ""),
            review_order=json.dumps(plan.get("review_order", file_paths)),
            file_paths=json.dumps(file_paths),
            diff_content=json.dumps(file_diffs),
            line_map=json.dumps(chunk_line_map),
        )
        db.add(chunk)
        chunk_records.append((chunk, file_diffs, chunk_line_map))
    db.commit()

    # ── 3b. Optional security scanners (deterministic, per-review opt-in) ───
    _run_scanner_stage(db, review, repo_path, pr_files, line_maps, chunk_records)

    # ── 4. AI review per chunk (inline comments) ─────────────────────────────
    _set_status(db, review, "AI_RUNNING")
    _ai_review_chunks(db, ai, chunk_records, repo_path)
    _set_status(db, review, "READY")


def _ai_review_chunks(db: Session, ai, chunk_records, repo_path) -> None:
    for chunk, file_diffs, chunk_line_map in chunk_records:
        try:
            result = ai.review_chunk(
                chunk.title or "",
                file_diffs,
                chunk_line_map,
                repo_path=repo_path,
            )
            chunk.ai_suggestions_md = result.get("assessment", "")
            chunk.ai_comments_json = json.dumps(result.get("comments", []))

            for c in result.get("comments", []):
                db.add(DraftComment(
                    review_chunk_id=chunk.id,
                    path=c["path"],
                    line=c["line"],
                    side=c.get("side", "RIGHT"),
                    body_md=c.get("body", ""),
                    severity=c.get("severity", "high"),
                    label=c.get("label"),
                ))

            chunk.status = "AI_DONE"
        except Exception as e:
            logger.warning("AI review failed for chunk %s: %s", chunk.id, e)
            chunk.status = "ERROR"
            chunk.ai_suggestions_md = f"_tara couldn't review this chunk: {e}_"
        db.commit()


def resume_review(review_id: int) -> None:
    """Resume AI processing on chunks that didn't complete (PENDING or ERROR)."""
    db: Session = SessionLocal()
    try:
        _run_resume(db, review_id)
    except Exception as exc:
        logger.exception("Resume failed for review_id=%s", review_id)
        db.rollback()
        try:
            review = db.get(ReviewInstance, review_id)
            if review:
                _set_status(db, review, "ERROR", str(exc))
        except Exception:
            pass
    finally:
        db.close()


def _run_resume(db: Session, review_id: int) -> None:
    review = db.get(ReviewInstance, review_id)
    if not review:
        return
    pr = db.get(PullRequest, review.pull_request_id)
    if not pr:
        _set_status(db, review, "ERROR", "Associated PR record not found")
        return

    pending_chunks = (
        db.query(ReviewChunk)
        .filter(
            ReviewChunk.review_instance_id == review_id,
            ReviewChunk.status.in_(["PENDING", "ERROR"]),
        )
        .order_by(ReviewChunk.order_index)
        .all()
    )
    if not pending_chunks:
        _set_status(db, review, "READY")
        return

    # Clear stale drafts on ERROR chunks so retry doesn't duplicate
    error_chunk_ids = [c.id for c in pending_chunks if c.status == "ERROR"]
    if error_chunk_ids:
        db.query(DraftComment).filter(DraftComment.review_chunk_id.in_(error_chunk_ids)).delete(synchronize_session=False)
        db.commit()

    repo_path = None
    try:
        repo_path = ensure_repo(pr.owner, pr.repo, pr_number=pr.pr_number, pr_files=[])
    except Exception as e:
        logger.warning("Could not ensure repo on resume (AI will work from diff only): %s", e)

    _set_status(db, review, "AI_RUNNING")
    ai = get_ai_provider(review.model_provider)
    chunk_records = [(c, c.get_diff_content(), c.get_line_map()) for c in pending_chunks]
    _ai_review_chunks(db, ai, chunk_records, repo_path)
    _set_status(db, review, "READY")


def _run_scanner_stage(db, review, repo_path, pr_files, line_maps, chunk_records) -> None:
    """Run the review's opted-in scanners against the PR checkout and save
    anchorable findings as draft comments. Never fails the review."""
    scanner_names = review.get_scanners()
    if not scanner_names:
        return
    if repo_path is None:
        logger.warning("Scanners selected but repo clone unavailable, skipping")
        return
    _set_status(db, review, "SCANNING")
    try:
        findings = run_scanners(scanner_names, repo_path, pr_files)
        saved = _save_scanner_comments(db, findings, line_maps, chunk_records)
        logger.info("Scanners: %d finding(s), %d saved as draft comments", len(findings), saved)
    except Exception as e:
        logger.warning("Scanner stage failed: %s", e)


def _save_scanner_comments(db, findings, line_maps, chunk_records) -> int:
    saved = 0
    for finding in findings:
        chunk = _chunk_for_path(chunk_records, finding.path)
        line = _anchor_finding_line(line_maps, finding)
        if chunk is None or line is None:
            logger.info(
                "Dropping unanchorable %s finding at %s:%s",
                finding.scanner, finding.path, finding.line,
            )
            continue
        db.add(DraftComment(
            review_chunk_id=chunk.id,
            path=finding.path,
            line=line,
            side="RIGHT",
            body_md=_format_finding(finding),
            source=finding.scanner,
        ))
        saved += 1
    db.commit()
    return saved


def _chunk_for_path(chunk_records, path):
    for chunk, file_diffs, _ in chunk_records:
        if path in file_diffs:
            return chunk
    return None


def _anchor_finding_line(line_maps, finding):
    """Diff line to attach the finding to, or None to drop it.
    File-level findings anchor to the file's first commentable line; line
    findings must land exactly on a changed/context line — anything else
    is a pre-existing issue outside this PR's diff."""
    commentable = line_maps.get(finding.path or "", [])
    if not commentable:
        return None
    if finding.line is None:
        return commentable[0]
    return finding.line if finding.line in set(commentable) else None


def _format_finding(finding) -> str:
    return (
        f"**[{finding.scanner}]** `{finding.rule_id}` · {finding.severity}\n\n"
        f"{finding.message}"
    )


def _parse_dt(s: str) -> datetime:
    if not s:
        return datetime.utcnow()
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00")).replace(tzinfo=None)
    except Exception:
        return datetime.utcnow()
