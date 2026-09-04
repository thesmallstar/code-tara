# Tech Decisions

## SQLite over PostgreSQL (v0)

- **Date:** 2026-03-01
- **Status:** Decided
- **Decision:** Use SQLite with SQLAlchemy sync engine
- **Why:** Local dev tool with single-user workload; no infrastructure needed, zero config, fast iteration
- **Alternatives considered:** PostgreSQL (overkill for v0), async SQLAlchemy (unnecessary complexity)
- **Trade-offs:** Not suitable for multi-user deployment; easy to swap via `DATABASE_URL` env var later

---

## Sync background tasks (not async)

- **Date:** 2026-03-01
- **Status:** Decided
- **Decision:** FastAPI `BackgroundTasks` with sync `def` functions; `httpx.Client` (sync) for HTTP
- **Why:** Avoids SQLAlchemy sync/async boundary issues; simpler mental model for v0
- **Alternatives considered:** Celery, asyncio fully async pipeline
- **Trade-offs:** Long AI calls block a thread; acceptable for single-user local tool

---

## Pluggable AI provider via base class

- **Date:** 2026-03-01
- **Status:** Superseded by factory pattern (2026-03-08)
- **Decision:** `AIProvider` ABC in `app/ai/base.py` with `codex.py` (OpenAI) and `claude.py` (Anthropic) implementations
- **Why:** Lets user choose provider per review session; trivial to add new providers
- **Alternatives considered:** Hard-coded provider, LangChain abstraction (too heavy)

---

## Factory pattern with ProviderRegistry

- **Date:** 2026-03-08
- **Status:** Decided
- **Decision:** `ProviderRegistry` class in `app/ai/base.py` with `register` decorator, `create(name)`, and `available()` methods. Each provider self-registers via `@ProviderRegistry.register("name", label="Label")`. Auto-registration via `app/ai/__init__.py` imports.
- **Why:** Eliminates manual if/else dispatch in `service.py`; adding a new provider requires zero changes to routing or service code — just a new file with a decorator. `GET /api/providers` endpoint exposes available providers for the frontend.
- **Alternatives considered:** Manual if/else (what we had — doesn't scale), plugin discovery via `importlib` (overkill for 2-3 providers)
- **Trade-offs:** Providers must be imported for registration; handled by `__init__.py`

---

## Codex CLI: `codex exec` non-interactive mode

- **Date:** 2026-03-08
- **Status:** Decided
- **Decision:** Use `codex exec "prompt" -s read-only --ephemeral` for all Codex AI calls. Structured JSON output via `--output-schema <temp_file.json>` (file path, not inline).
- **Why:** The old `codex -q` flag is legacy (TypeScript CLI). Modern Codex CLI (Rust) uses `codex exec` for non-interactive mode. `-s read-only` keeps it safe; `--ephemeral` avoids session file clutter.
- **Key difference from Claude:** `--output-schema` takes a file path, not inline JSON — requires writing temp schema files and cleaning up.
- **Alternatives considered:** OpenAI Python SDK fallback (removed for simplicity; assume CLI is authenticated, same pattern as Claude provider)

---


## AI CLI timeout is configurable, default 15 minutes

- **Date:** 2026-09-04
- **Decision:** Both providers read their `subprocess.run` timeout from `cli_timeout_seconds()` in `app/ai/base.py`, backed by `AI_CLI_TIMEOUT_SECONDS` (default 900). Previously hardcoded to 300 in both `codex.py` and `claude.py`.
- **Why:** Running several reviews in parallel made large chunks routinely exceed 5 minutes; every timeout surfaced as an `ERROR` chunk that had to be resumed by hand. The limit depends on machine load and chunk size, so it belongs in `.env`, not code.
- **Alternatives considered:** Retry on timeout inside the provider (hides slow runs and doubles cost); per-chunk adaptive timeout based on diff size (premature — one knob is enough for now).
- **Trade-offs:** A stuck CLI now holds a worker for up to 15 minutes before the chunk errors. Acceptable for a local single-user tool; lower the value if that hurts.

## Inline GitHub comments — nearest-line anchoring

- **Date:** 2026-03-01
- **Status:** Decided
- **Decision:** Build a diff line map from GitHub patch strings; validate AI-suggested lines against the map; auto-anchor to nearest commentable line if invalid
- **Why:** GitHub 422s on lines not in the diff; anchoring avoids silent failures
- **Alternatives considered:** Drop invalid comments (bad UX), let user pick (complex UX)

---

## Re-review as a tab, not a separate page/route

- **Date:** 2026-03-03
- **Status:** Decided
- **Decision:** Re-review results (changes summary + thread opinions) are shown inside a "Re-review" tab on the existing ReviewInstance page, not as a separate `/re-review/:id` route
- **Why:** The user wants continuity — "built on top of the review view". Navigating to a new page loses context (which chunk was selected, thread state, etc.). A tab preserves layout and sidepanel while adding new context.
- **Alternatives considered:** Separate `/re-review/:id` page (built first, then removed per user feedback)
- **Trade-offs:** `ReReviewPanel` holds its own state (re-review job ID + polling) independently; if user leaves and returns to the tab, state is reset — acceptable for v0

---

## GitHub `position` field for outdated thread detection

- **Date:** 2026-03-03
- **Status:** Decided
- **Decision:** Store `position` from GitHub review comment API on `ReviewThread`; `position === null` means the comment is on a stale/outdated diff
- **Why:** GitHub itself uses `null` position to indicate an outdated comment; no extra API calls needed
- **Trade-offs:** `position` only available for `REVIEW_COMMENT` type, not `ISSUE_COMMENT`

---

## Heuristic chunking (no embeddings in v0)

- **Date:** 2026-03-01
- **Status:** Decided
- **Decision:** Group files by test/source pairing, then by top-level directory; max 5 files or 600 diff lines per chunk
- **Why:** Fast, deterministic, no ML infra needed; good enough for 90% of PRs
- **Alternatives considered:** Embedding-based semantic clustering (planned for v1)

---

## Shared prompt store with file-based persistence

- **Date:** 2026-03-22
- **Status:** Decided
- **Decision:** Extract all AI prompts into `app/ai/prompts.py` with hardcoded defaults. User overrides stored in `data/prompts.json`. Both Claude and Codex providers read from the same store via `get_prompt(key)`.
- **Why:** Eliminates prompt duplication between providers; lets users customize without touching code; no DB migration needed for a single-user tool; JSON file is simple, gitignored, and easy to reset.
- **What's editable:** Only natural language instructions. JSON schemas and output format enforcement are appended by provider code and stay locked.
- **Alternatives considered:** DB table with Alembic migration (heavier than needed), env vars (awkward for multiline text), YAML config (unnecessary dependency)

---


## Overview always carries an architecture diagram; all prompts write in ASD-STE100

- **Date:** 2026-09-04
- **Status:** Decided
- **Decision:** Prompt-only change in `app/ai/prompts.py`. Two shared blocks, `ARCHITECTURE_DIAGRAM_RULES` and `STE_RULES`, are interpolated into the default prompt texts. `pr_summary` now requires one `flowchart TD` right after the overview: an outer subgraph named after the PR, numbered subgraphs per logical area in reading order, one node per component with a `<br/>` detail line, meaningful shapes (cylinder = stored data, diamond = dispatch), labeled edges, dotted edges for deferred flows, explicit scope and left-out nodes, a separate "Review flow" lane of numbered steps, and per-area `classDef` colors. `STE_RULES` (Simplified Technical English: short active sentences, one term per concept, commands for instructions, no hedging) is appended to every prompt.
- **Why:** Reviewers asked for a map of the change before reading diffs; a consistent diagram shape makes overviews comparable across PRs. STE keeps comments uniform in tone and easy to act on, which matters when a review has dozens of AI-suggested comments.
- **Alternatives considered:** Generating the diagram in code from the chunk plan (deterministic but blind to real architecture); a separate "diagram" prompt and API call (extra latency and cost per review; the summary call already reads the repo). A frontend-side renderer for a custom JSON graph (mermaid already works and stays editable by the user).
- **Trade-offs:** Longer prompts (about +1.5k chars per call). A model may produce non-rendering mermaid; `Mermaid.jsx` already falls back to showing the source. Users with a custom `pr_summary` override in `data/prompts.json` do not get the new default until they reset it from the Instructions tab.

## Mermaid diagrams in AI output

- **Date:** 2026-03-22
- **Status:** Decided
- **Decision:** AI prompts optionally include mermaid diagrams for complex flows. Frontend renders ` ```mermaid ` code fences as inline SVG using the mermaid JS library. Falls back to raw code block on invalid syntax.
- **Why:** Visual diagrams help explain architecture, data flows, and component relationships — especially in large PRs. Rendering inline (not at the end) keeps diagrams contextual.
- **Alternatives considered:** Server-side rendering (slower, needs graphviz/puppeteer), separate diagram panel (loses inline context)

---

## Inline draft comment indicators on diff

- **Date:** 2026-03-22
- **Status:** Decided
- **Decision:** Show 💬 icons on diff lines that have draft comments. Click to expand a popover below the line with edit/send/delete actions. Does not shift code — popover is an extra table row.
- **Why:** Users couldn't tell which diff lines had comments without scrolling the right panel. Inline indicators make the connection visible. Full actions inline means less panel-switching.
- **Alternatives considered:** Highlight lines only (no expand), inline the full comment body always (too noisy, shifts code)

---

## Instructions as tab, not separate page

- **Date:** 2026-03-22
- **Status:** Decided
- **Decision:** Prompt/instruction editor embedded as a "Instructions" tab on the landing page right panel, alongside "Reviews". Not a separate `/prompts` route.
- **Why:** Keeps the landing page as the single hub. Users don't need a separate settings page for a feature they rarely change. Lazy-loaded on first tab switch.
- **Alternatives considered:** Separate `/prompts` page (built first, then removed — felt disconnected from the main flow)

---

## Optional security scanners (opengrep, gitleaks, osv-scanner, checkov)

- **Date:** 2026-08-04
- **Status:** Decided
- **Decision:** A generic scanner framework (`backend/app/scanners/`) wraps free, user-installed CLI security tools and posts their findings as inline draft comments alongside the AI review. Four scanners: opengrep (SAST), gitleaks (secrets), osv-scanner (dependency CVEs), checkov (IaC). All are **off by default** and opted into per review via checkboxes in the start-review form; unavailable ones render disabled with install instructions (`GET /api/scanners` reports availability via `shutil.which`). Findings run against the sparse PR checkout after chunk planning, anchor only to lines in the PR diff (exact match — findings on unchanged lines are pre-existing issues and are dropped), and land as `DraftComment` rows with a `source` column distinguishing them from AI comments. One scanner failing never blocks the review or other scanners.
- **Why:** Deterministic scanners catch classes of issues (committed secrets, known CVEs, injection patterns) cheaply and reproducibly; the AI review can then discuss rather than rediscover them. Shelling out to user-installed binaries keeps this repo dependency-free and license-clean.
- **Licensing:** opengrep engine is LGPL-2.1; gitleaks MIT; osv-scanner and checkov Apache-2.0 — all fine to invoke as external tools. **opengrep-rules carries a Commons Clause condition** (no selling a product whose value derives substantially from the rules), so the rules are never vendored — users clone `opengrep/opengrep-rules` themselves and point `OPENGREP_RULES_PATH` at it. Any future paid/hosted offering would need to revisit the rules source.
- **Alternatives considered:** Semgrep (registry rules have a restrictive license — opengrep is the community fork), Trivy for SCA (Apache-2.0 but its secrets/IaC modes duplicate gitleaks/checkov; osv-scanner is lighter), Bandit/gosec (per-language, largely covered by opengrep rules; would double-report).

---

## Re-review checkout fix: fetch + hard-reset, not git pull

- **Date:** 2026-08-04
- **Status:** Decided
- **Decision:** When a PR clone already exists, `ensure_repo` re-fetches `pull/<n>/head`, hard-resets to `FETCH_HEAD`, and refreshes the sparse-checkout file list (checking return codes). Previously it ran `git pull`, which always failed silently because the local `pr-head` branch has no upstream — re-reviews and chat used the stale first-review checkout while line maps came from the fresh API diff.
- **Why:** Scanners and the AI both read the checkout; a stale checkout silently misanchors comments and scans old code.
