"""
Shared prompt store for all AI providers.

Prompts are the natural language instructions sent to the AI. JSON schemas
are structural and stay hardcoded — only the instruction text is editable.

Storage: data/prompts.json (auto-created on first read).
"""

import json
from pathlib import Path

_DATA_DIR = Path(__file__).resolve().parent.parent.parent.parent / "data"
_PROMPTS_FILE = _DATA_DIR / "prompts.json"

DEFAULTS = {
    "plan_chunks": {
        "label": "Chunk Planning",
        "description": "How tara groups changed files into logical review chunks",
        "text": """\
You are a senior software engineer structuring a code review session for a human reviewer.

Given all changed files in a PR, group them into logical review chunks that should be reviewed together.
Think about: what features/concerns do these files implement? What context does a reviewer need first?

Rules:
- Every changed file must appear in exactly one chunk
- Order chunks so the reviewer builds context progressively (foundations before features, models before routes, etc.)
- review_order within a chunk = best reading order (e.g., interfaces before implementations)
- 1-6 files per chunk; use judgment over rigid limits
- If only 1-3 files changed total, one chunk is fine""",
    },
    "pr_summary": {
        "label": "PR Summary",
        "description": "How tara summarizes the overall pull request",
        "text": """\
You are a senior software engineer performing a code review.
Given a pull request, provide a concise markdown summary with:
1. A 2-3 sentence overview of what this PR does and why.
2. A bullet list of the key changes.
3. A brief "Areas to watch" section with any concerns or things that need attention.
You have access to the repository files — read them for full context if needed.
Keep it factual and useful for a reviewer skimming before diving in.

When it helps clarify complex flows, architecture, or relationships, include a mermaid diagram using a ```mermaid code fence. Only use diagrams when they genuinely aid understanding — not for every review.""",
    },
    "chunk_review": {
        "label": "Chunk Review",
        "description": "How tara reviews each chunk and writes inline comments",
        "text": """\
You are a senior software engineer reviewing a specific set of file changes (a "chunk") in a pull request.
You have access to the full repository — read the files to understand context beyond the diff.

Rules:
- Only comment on lines that exist in the provided diff (additions and context lines on the RIGHT side).
- Each comment must be specific and actionable.
- Limit to the most important 3-5 issues. Do not nitpick style unless critical.
- If there are no issues, return an empty comments array and a positive assessment.
- In the assessment, you may include a mermaid diagram (```mermaid code fence) if it helps explain complex logic, data flow, or component relationships. Only when it genuinely adds clarity.""",
    },
    "chat": {
        "label": "Chat",
        "description": "How tara behaves in per-chunk chat conversations",
        "text": """\
You are a code review assistant helping a developer refine their review comments.
You have access to the repository files — read them if needed for better context.
Help the user craft clear, specific, and constructive review comments. Be direct and concise.""",
    },
    "re_review": {
        "label": "Re-review",
        "description": "How tara analyzes changes since last review and evaluates open threads",
        "text": """\
You are re-reviewing a pull request that was previously reviewed.

Please:
1. Write a concise markdown summary of what changed since the last review (2-5 bullet points). If no new changes, say so.
2. For each open review thread listed above, decide:
   - should_resolve: true if the concern was addressed in the new changes or is no longer relevant; false if it still needs attention or a response
   - reason: 1-sentence explanation""",
    },
}


def _load_overrides() -> dict:
    if not _PROMPTS_FILE.exists():
        return {}
    try:
        return json.loads(_PROMPTS_FILE.read_text())
    except (json.JSONDecodeError, OSError):
        return {}


def _save_overrides(overrides: dict):
    _DATA_DIR.mkdir(exist_ok=True)
    _PROMPTS_FILE.write_text(json.dumps(overrides, indent=2))


def get_prompt(key: str) -> str:
    overrides = _load_overrides()
    if key in overrides:
        return overrides[key]
    default = DEFAULTS.get(key)
    if default:
        return default["text"]
    raise KeyError(f"Unknown prompt key: {key}")


def get_all_prompts() -> list[dict]:
    overrides = _load_overrides()
    result = []
    for key, default in DEFAULTS.items():
        is_custom = key in overrides
        result.append({
            "key": key,
            "label": default["label"],
            "description": default["description"],
            "text": overrides.get(key, default["text"]),
            "is_custom": is_custom,
        })
    return result


def update_prompt(key: str, text: str):
    if key not in DEFAULTS:
        raise KeyError(f"Unknown prompt key: {key}")
    overrides = _load_overrides()
    overrides[key] = text
    _save_overrides(overrides)


def reset_prompt(key: str):
    if key not in DEFAULTS:
        raise KeyError(f"Unknown prompt key: {key}")
    overrides = _load_overrides()
    overrides.pop(key, None)
    _save_overrides(overrides)
