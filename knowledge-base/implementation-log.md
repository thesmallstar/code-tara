# Implementation Log

## Unreleased

- **Date:** 2026-09-04
- **What:** Overview prompt now requires a structured mermaid architecture diagram; every prompt asks for ASD-STE100 (Simplified Technical English) output
- **How:**
  - `backend/app/ai/prompts.py` — `STE_RULES` and `ARCHITECTURE_DIAGRAM_RULES` constants, interpolated into all `DEFAULTS` texts (users see and can edit the full text in the Instructions tab)
  - `backend/tests/test_prompts.py` — `TestDefaultPromptContent` guards both blocks
  - `README.md` — feature bullets
- **Why:** See tech-decisions "Overview always carries an architecture diagram"
- **Verification:** `uv run pytest` — same 4 pre-existing `test_reviews.py` failures as `main`, everything else passes

- **Date:** 2026-09-04
- **What:** Configurable AI CLI timeout (`AI_CLI_TIMEOUT_SECONDS`, default 900s) replacing the hardcoded 300s in both providers
- **How:**
  - `backend/app/ai/base.py` — `cli_timeout_seconds()` reads the env var
  - `backend/app/ai/codex.py`, `backend/app/ai/claude.py` — `subprocess.run(..., timeout=cli_timeout_seconds())`
  - `docs/setup.md` — documented under "Available overrides"
- **Why:** Parallel reviews pushed large chunks past 5 minutes and left them as `ERROR` chunks (see tech-decisions)
- **Verification:** `uv run pytest` — same 4 pre-existing `test_reviews.py` failures as `main`, everything else passes

- **Date:** 2026-08-04
- **What:** Optional security scanners (opengrep, gitleaks, osv-scanner, checkov) with inline findings, plus a fix for stale re-review checkouts
- **How:**
  - `backend/app/scanners/` — new scanner framework: `base.py` (Scanner ABC + ScanFinding), one module per tool, registry with `list_scanners()` / `run_scanners()`; opengrep rules come from a user-cloned `OPENGREP_RULES_PATH` and only rule dirs matching changed-file languages run
  - `backend/app/routers/scanners.py` — `GET /api/scanners` reporting availability + install hints
  - `backend/app/reviews/service.py` — `SCANNING` stage after chunk planning; findings anchored to exact diff lines (file-level findings to the file's first commentable line) and saved as `DraftComment`s with `source=<scanner>`
  - `backend/app/models.py` + alembic `b7e3d1f2c4a5` — `review_instances.scanners_json`, `draft_comments.source`
  - `backend/app/github/clone_manager.py` — exists-path now fetches `pull/<n>/head` + hard-resets to `FETCH_HEAD` and refreshes sparse-checkout (old `git pull` failed silently: `pr-head` has no upstream)
  - `frontend/src/pages/Landing.jsx` — scanner checkboxes in the start-review form, off by default, disabled with install instructions when a binary is missing; `frontend/src/components/DraftComments.jsx` — source badge on scanner comments
- **Why:**
  - Deterministic scanners catch secrets/CVEs/injection patterns cheaply; keeping them opt-in, user-installed CLIs keeps the repo dependency-free and license-clean (see tech-decisions: opengrep-rules Commons Clause)
- **Verification:** `uv run pytest tests/test_scanners.py` (18 passed; the 4 pre-existing `test_reviews.py` failures also fail on `main`), `npm -C frontend run build`

- **Date:** 2026-06-02
- **What:** AI now assigns severity per draft comment (completes the future work flagged in the 2026-05-22 severity-ranking entry)
- **How:**
  - `backend/app/ai/prompts.py` — added a severity rubric to the `chunk_review` prompt (`critical` security/data-loss/crashes, `high` likely bugs, `medium` real-but-moderate issues, `low` nits/optional)
  - `backend/app/ai/claude.py` & `backend/app/ai/codex.py` — added `severity` (enum `critical | high | medium | low`) to `_CHUNK_REVIEW_SCHEMA` and made it `required` so the model must set it
  - `backend/app/reviews/service.py` — `_ai_review_chunks` now writes `severity=c.get("severity", "high")` instead of the hardcoded `"high"`
- **Why:**
  - The severity column, sort ranking, and UI badges shipped on 2026-05-22, but every AI-generated draft was written as `high`, so triage was meaningless — the LLM's own assessment of importance was discarded
- **Notes:**
  - `_validate_and_anchor_comments` already passes unknown comment fields through via `{**c, ...}`, so no validator change was needed
  - The `.get("severity", "high")` fallback keeps the heuristic-chunker fallback path and any older cached output safe; the sort `case` in `chunks.py` already has `else_=0` for unexpected values
  - No schema/migration change — the `DraftComment.severity` column already exists

- **Date:** 2026-05-22
- **What:** Added a "resume" button so AI review can pick up where it left off
- **How:**
  - `backend/app/reviews/service.py` — extracted the per-chunk AI loop into `_ai_review_chunks(db, ai, chunk_records, repo_path)`; added `resume_review(review_id)` + `_run_resume` that fetch only chunks with `status in ("PENDING", "ERROR")`, clear stale drafts on ERROR chunks (to avoid duplicates), re-ensure the repo clone, then run the AI loop for just those chunks
  - `backend/app/routers/reviews.py` — `POST /api/reviews/{review_id}/resume` schedules `resume_review` as a background task; returns 400 if there are no pending/ERROR chunks
  - `frontend/src/lib/api.js` — `api.resumeReview(id)`
  - `frontend/src/pages/ReviewInstance.jsx` — `TopBar` shows a purple "resume (N)" button next to "re-run tara" when `!isActive && pendingCount > 0`; clicking calls the new endpoint and immediately re-fetches the review so polling kicks back in
- **Why:**
  - When the AI loop dies partway (server restart, exception in the loop, etc.) chunks stay PENDING and the only recovery was "re-run tara", which re-fetches PR data, re-summarizes, re-chunks, and re-runs the AI on every chunk. Resume is much cheaper because it touches only the unfinished chunks and skips the planning steps entirely
- **Notes:**
  - Resume reuses the existing chunks' `diff_content` / `line_map` from the DB so we don't re-call GitHub
  - `ensure_repo` is idempotent so re-calling it on resume is safe and cheap (uses local cache)
  - Drafts attached to ERROR chunks are deleted before retry so a partial previous run doesn't duplicate drafts; PENDING chunks have no drafts yet, so nothing to clear

- **Date:** 2026-05-22
- **What:** Added severity ranking to draft comments
- **How:**
  - `backend/app/models.py` — added `severity` column to `DraftComment` (`critical | high | medium | low`, default `high`, NOT NULL)
  - `backend/alembic/versions/67321b344688_add_severity_to_draft_comments.py` — schema migration with `server_default='high'` to backfill existing rows
  - `backend/app/schemas.py` — added `severity` to `DraftCommentCreate` (default `high`), `DraftCommentUpdate` (optional), and `DraftCommentResponse`
  - `backend/app/routers/chunks.py` — `get_drafts` orders by severity desc → path → line (via SQLAlchemy `case`); `create_draft`/`update_draft` accept severity
  - `backend/app/reviews/service.py` — AI-generated drafts written with `severity="high"` until the AI starts setting it dynamically
  - `frontend/src/lib/severity.js` — severity → tailwind class + rank helpers + `sortBySeverity`
  - `frontend/src/components/DraftComments.jsx` — severity badge in the card header, severity picker in the edit form, client-side sort on load/edit/send
- **Why:**
  - Reviewers had no way to triage drafts; all suggestions looked equally weighted. Severity ranking lets the AI surface the most important issues first and the reviewer focus there
- **Notes:**
  - For now severity is hardcoded to `high` for AI-generated drafts. Future work: let the AI assign severity per draft from the prompt
  - The right panel in `ReviewInstance.jsx` is now resizable (drag handle, persisted to `localStorage` under `tara:rightPanelWidth`, 260–900px range)
- **Date:** 2026-03-27
- **What:** Restored `Submit Review` visibility in the review sidebar
- **How:**
  - `frontend/src/pages/ReviewInstance.jsx` — moved `Submit Review` back above `Threads` / `Re-review` in the sidebar order
  - `frontend/src/pages/ReviewInstance.jsx` — keep the tab visible even while a review is still processing, but render it disabled until submission is allowed
- **Why:**
  - The current UI placed `Submit Review` below the thread actions and hid it entirely while review status was active, which made it look like the button had disappeared
- **Verification:** `npm -C frontend run build`

- **Date:** 2026-03-27
- **What:** Persisted per-file review checkboxes inside chunk diffs
- **How:**
  - `backend/app/models.py` — added `checked_file_paths_json` on `ReviewChunk`
  - `backend/app/routers/chunks.py` — added `PATCH /api/chunks/{id}/checked-files` and included `checked_file_paths` in chunk detail responses
  - `frontend/src/pages/ReviewInstance.jsx` — load checked file paths from chunk detail and persist each toggle through the chunk API
  - `frontend/src/components/DiffView.jsx` — made file review checkboxes controlled by server-backed chunk state instead of browser-only state
- **Why:**
  - File checkboxes in the diff view were stored only in component state, so switching tabs, reloading the chunk, or remounting the review page cleared them
- **Verification:**
  - `npm -C frontend run build`
  - `backend/.venv/bin/pytest backend/tests/test_chunks.py -v`

## v0 Initial Build

- **Date:** 2026-03-01
- **What:** Full end-to-end v0 — GitHub verification, PR ingestion, AI review pipeline, inline comments, chat, draft management
- **How:**
  - **Backend** (`backend/app/`):
    - `github/client.py` — `GitHubClient` using httpx; falls back from `GITHUB_TOKEN` env to `gh auth token` CLI
    - `github/diff_parser.py` — unified diff parser; builds `(path, new_line) → commentable` maps
    - `ai/base.py`, `ai/codex.py`, `ai/claude.py` — `AIProvider` ABC with OpenAI and Anthropic implementations; structured JSON output for inline comments
    - `reviews/chunker.py` — heuristic grouper: test↔source pairing + directory grouping, max 5 files/600 lines per chunk
    - `reviews/service.py` — `process_review()` background task: SYNCING → SUMMARIZING → CHUNKING → AI_RUNNING → READY
    - `routers/` — full CRUD for reviews, chunks, chat, drafts, threads
  - **Frontend** (`frontend/src/`):
    - `pages/Landing.jsx` — GitHub status widget, PR URL input, model selector
    - `pages/ReviewInstance.jsx` — 3-column layout: chunk sidebar + diff/overview + chat/drafts right panel; polls `GET /api/reviews/:id` while active
    - `components/DiffView.jsx` — client-side unified diff parser, color-coded table with hover comment buttons
    - `components/ChatPanel.jsx` — streaming-style chat with AI per chunk
    - `components/DraftComments.jsx` — list/edit/delete/send-to-GitHub draft comments
    - `components/ThreadsPanel.jsx` — existing PR threads with inline reply
- **Depends on:** GitHub `gh` CLI or `GITHUB_TOKEN`; `ANTHROPIC_API_KEY` or `OPENAI_API_KEY`
- **Notes:**
  - All data in SQLite at `./data/code-tara.db` (gitignored)
  - Frontend polls every 3s while review is processing
  - AI-suggested inline comments are pre-populated as DRAFT records

## v0.1 — Human Progress & PR Actions

- **Date:** 2026-03-03
- **What:** `human_done` per chunk (DB-persisted), progress bar, PR approval/request-changes/comment from UI, comment labels, PR state on landing page, review requests section
- **Key files changed:**
  - `models.py` — `human_done` on `ReviewChunk`, `label` on `DraftComment`, `pr_state`/`review_decision` on `PullRequest`
  - `routers/chunks.py` — `PATCH /{id}/done` toggle; label persisted on drafts; `_body_with_label()` prepends label to GitHub body at send time
  - `routers/reviews.py` — `POST /{id}/submit` for PR review events (APPROVE/REQUEST_CHANGES/COMMENT)
  - `ReviewInstance.jsx` — progress bar, `SubmitReviewPanel`, `LabelPicker`
  - `Landing.jsx` — PR state badges, review decision badges, `ReviewRequestRow`
- **Alembic migrations:** `a904c1266c2c`, `9970c026bb25`
- **Tests:** 26 passing unit tests (`test_chunks.py`, `test_reviews.py`, `test_helpers.py`)

## v0.3 — Re-review Tab + Thread Improvements + Bug Fixes

- **Date:** 2026-03-03
- **What:** Re-review feature (changes summary + thread opinions), thread panel improvements (outdated badge, resolve, colored diff), UTC date fix across app, cache-delete fix on review create, all-done badge suppression
- **Key files changed:**
  - `models.py` — `ReReview` model; `position` + `is_resolved` added to `ReviewThread`
  - `schemas.py` — `ThreadOpinion`, `ReReviewResponse`; `ReviewThreadResponse` gets `position`/`is_resolved`; `ReviewRequestItem` gets `existing_review_id`/`last_reviewed_at`
  - `github/client.py` — `get_commit_compare(owner, repo, base, head)` → `GET /repos/{owner}/{repo}/compare/{base}...{head}`
  - `ai/base.py` — abstract `re_review(pr_data, diff_files, root_threads, issue_comments) -> dict`
  - `ai/claude.py` — `re_review()` implementation using `_RE_REVIEW_SCHEMA` and `claude -p` structured output
  - `reviews/re_review_service.py` (new) — `process_re_review()` background task: loads ReReview → PR → fetches current head SHA → compare diff → AI re-review → enrich opinions → DONE
  - `routers/re_reviews.py` (new) — `POST /api/reviews/{id}/re-review` (create + queue) and `GET /api/re-reviews/{id}` (poll)
  - `routers/reviews.py` — delete `ReviewRequestCache` row matching `pr_url` when review is created
  - `routers/threads.py` — `PATCH /{id}/resolve` toggles `is_resolved`, returns `{is_resolved: bool}`
  - `routers/github.py` — `_attach_existing_reviews()` bulk-queries PRs + latest ReviewInstance per PR; attaches to `ReviewRequestItem` via `model_copy(update={})`
  - `main.py` — registers `re_reviews` router
  - `ReviewInstance.jsx` — `ReReviewPanel` + `ThreadOpinionCard` components; "Re-review" sidebar tab; tab state updated to `'overview' | 'chunk' | 'threads' | 're-review'`
  - `ThreadsPanel.jsx` — `DiffHunk` (colored lines); `parseUtc`/`fmtDate` UTC fix; outdated pill when `position === null`; resolve button + optimistic toggle
  - `Landing.jsx` — `parseUtc`/`fmtDate`/`relativeDate` UTC helpers; "tara reviewed · Xd ago" badge on RequestRow; "re-review it" label; `handleStartReview` navigates to `/review/{id}` for existing reviews
- **Alembic migration:** `94eacd111d09`
- **Tests:** 51 passing — 13 new tests across `test_threads.py` and `test_re_reviews.py`
  - `test_threads.py` — resolve toggle: marks resolved, toggles back, 404 on missing
  - `test_re_reviews.py` — create (returns id, captures old SHA, 404), get (pending, done with opinions, 404), cache deletion on review create (removes matching, leaves others), existing_review_id in review requests (present when review exists, null when not)
- **Key UX decisions:**
  - Re-review is a tab inside ReviewInstance, NOT a separate page/route
  - "tara reviewed · Xd ago" badge on ReviewRequestRow is a clickable link to the old review (overview tab)
  - "re-review it" button navigates to `/review/{id}` with `{ state: { tab: 're-review' } }` so ReviewInstance auto-selects the Re-review tab on mount
  - Thread opinions sorted: "respond first" before "can resolve"
  - Old SHA stored at re-review creation time; compare API used to get diff; if same SHA → AI told "no new commits"

## v0.2 — Review Requests Cache + Refresh UX

- **Date:** 2026-03-03
- **What:** Cache GitHub review-requested PRs in SQLite; smart refresh (only if >1hr stale); show "synced X ago" with manual refresh button; correct UTC→local time display
- **Key files changed:**
  - `models.py` — `ReviewRequestCache` model
  - `routers/github.py` — `GET /review-requests` (DB cache) + `POST /review-requests/sync` (GitHub fetch → DB)
  - `schemas.py` — `ReviewRequestsResponse` wraps items + `last_synced_at`
  - `Landing.jsx` — `isStale()`/`saveLastSync()` helpers using localStorage; `setInterval` for 1hr auto-sync; UTC suffix fix for `formatLastSync`
  - `api.js` — added `syncReviewRequests`
- **Alembic migration:** `6fca07df826e`
- **Bug fixed:** `last_synced_at` stored as naive UTC in SQLite; frontend appended `Z` so browser parses it correctly as UTC instead of local time
- **Tests:** 12 new tests in `test_github.py` (38 total passing)
- **UX tarage:** Starting a review from "Requested Reviews" no longer navigates away — it removes the item from the list and appends to "Recent Reviews" in-place

## v0.4 — Codex Provider + Factory Pattern + Provider Switcher

- **Date:** 2026-03-08
- **What:** Dual AI provider support (Claude Code + Codex) with factory pattern; user picks provider from frontend
- **Key files changed:**
  - `ai/base.py` — added `ProviderRegistry` (register decorator, create, available)
  - `ai/__init__.py` — new file; auto-registers providers on import
  - `ai/claude.py` — added `@ProviderRegistry.register("claude", label="Claude Code")` decorator
  - `ai/codex.py` — full rewrite: `codex exec` non-interactive mode, `--output-schema` via temp files, all 5 `AIProvider` methods implemented natively (was delegating `re_review` to Claude)
  - `reviews/service.py` — `get_ai_provider()` now uses `ProviderRegistry.create()` instead of manual if/else
  - `main.py` — added `GET /api/providers` endpoint
  - `Landing.jsx` — provider switcher (segmented toggle), selection persisted in localStorage, wired into both `handleSubmit` and `handleStartReview`
  - `api.js` — added `getProviders()`
- **Tests:** 51 passing (no regressions)
- **No DB migration needed** — `model_provider` column already stored as free-form string

## v0.5 — Inline Drafts, Instructions Editor, Mermaid, Search & Pagination

- **Date:** 2026-03-22
- **What:** Inline draft comment indicators on diff view, customizable AI instructions, mermaid diagram rendering, review search + pagination, UX improvements
- **Key files changed:**
  - `ai/prompts.py` (new) — shared prompt store with defaults; file-based persistence (`data/prompts.json`); deduplicates prompts between Claude and Codex
  - `ai/claude.py` — removed hardcoded prompt constants, reads from `get_prompt()`
  - `ai/codex.py` — same deduplication, reads from shared prompt store
  - `routers/prompts.py` (new) — `GET /api/prompts`, `PUT /api/prompts/{key}`, `DELETE /api/prompts/{key}` (reset)
  - `routers/reviews.py` — added `q` (search), `page`, `per_page` params to list endpoint; returns paginated response
  - `models.py` — added index on `PullRequest.title` and `PullRequest.author` for search
  - `components/DiffView.jsx` — inline draft indicators (💬 icons on diff lines); `InlineDraftPopover` with edit/send/delete actions
  - `components/Mermaid.jsx` (new) — renders mermaid code fences as inline SVG diagrams
  - `components/MarkdownWithMermaid.jsx` (new) — ReactMarkdown wrapper with mermaid code block detection
  - `pages/ReviewInstance.jsx` — passes drafts to DiffView; uses MarkdownWithMermaid for AI output
  - `pages/Landing.jsx` — Reviews | Instructions tabs; `InstructionCard` component; search input + pagination for recent reviews; pointer cursor fix
  - `ChatPanel.jsx`, `ThreadsPanel.jsx` — use MarkdownWithMermaid for AI replies
  - `index.css` — global cursor rules (pointer on interactive elements)
- **Tests:** 67 passing — 16 new tests in `test_prompts.py` (prompt store + API endpoints)
- **Key decisions:**
  - Prompts stored as JSON file, not in DB — avoids migration for a single-user tool
  - JSON schemas stay hardcoded in provider code — only natural language instructions are user-editable
  - Instructions embedded as a tab on landing page, not a separate route
  - Mermaid renders inline wherever it appears in markdown — not pushed to end
  - Draft indicators don't shift code — popover expands below the line
