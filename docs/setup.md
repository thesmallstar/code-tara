# Setup Guide

## Requirements

| Tool | Version | Notes |
|------|---------|-------|
| Python | 3.13+ | managed by `uv` |
| Node.js | 18+ | for the React frontend |
| `uv` | latest | Python package/env manager |
| `claude` CLI | latest | Claude Code — [claude.ai/code](https://claude.ai/code) |
| `gh` CLI | latest | GitHub CLI — [cli.github.com](https://cli.github.com) |

---

## Step-by-step

### 1. Clone the repo

```bash
git clone https://github.com/your-username/code-tara
cd code-tara
```

### 2. Authenticate the CLIs

```bash
# GitHub
gh auth login
gh auth status   # should show: ✓ Logged in to github.com

# Claude Code
claude auth login
claude --version  # confirm it's installed
```

### 3. Configure environment (optional)

The defaults work out of the box. Only edit `.env` if you need to override:

```bash
cp .env .env.local
# then edit .env.local
```

Available overrides:

```bash
# Use a personal access token instead of gh CLI
GITHUB_TOKEN=ghp_...

# SQLite location (default: ./data/code-tara.db)
DATABASE_URL=sqlite:///./data/code-tara.db

# Max seconds one AI CLI call (claude / codex) may run before tara marks the chunk as errored (default: 900)
AI_CLI_TIMEOUT_SECONDS=900
```

### 4. Install dependencies

```bash
make install
```

This runs:
- `cd frontend && npm install`
- `cd backend && uv sync`

### 5. Run

```bash
make dev
```

- Frontend: http://localhost:3000
- Backend API + docs: http://localhost:8000/docs

### 6. Security scanners (optional)

tara can run free security scanners on each PR and leave their findings as
inline comments alongside the AI review. Every scanner is **off by default** —
tick the ones you want in the start-review form. Install only what you need:

```bash
# Opengrep (SAST) — engine + rules
curl -fsSL https://raw.githubusercontent.com/opengrep/opengrep/main/install.sh | bash
make seed-opengrep-rules   # clones the rules registry to ~/opengrep-rules

# Gitleaks (committed secrets)
brew install gitleaks

# OSV-Scanner (dependency vulnerabilities)
brew install osv-scanner

# Checkov (Terraform / K8s / Dockerfile misconfigurations)
brew install checkov       # or: pip install checkov
```

The opengrep rules are licensed with a Commons Clause condition, so they are
never bundled — `make seed-opengrep-rules` clones them for you. Set
`OPENGREP_RULES_PATH` in `.env` if you keep them somewhere else. Scanners that
aren't installed simply show up disabled in the UI with these instructions.

---

## Makefile targets

| Target | What it does |
|--------|-------------|
| `make install` | Install all deps (frontend + backend) |
| `make dev` | Kill ports 8000/3000, start both servers |
| `make frontend` | Start only the frontend (Vite dev server) |
| `make backend` | Start only the backend (uvicorn --reload) |
| `make kill` | Kill processes on ports 8000 and 3000 |
| `make seed-opengrep-rules` | Clone/update the opengrep rules registry |
| `make clean` | Remove node_modules, .venv, dist, DB |

---

## Troubleshooting

### "claude CLI not found"

Install Claude Code from [claude.ai/code](https://claude.ai/code) and run `claude auth login`.

### "GitHub token not found"

Run `gh auth login`, or set `GITHUB_TOKEN=ghp_...` in `.env`.

### "attempt to write a readonly database"

```bash
chmod 644 data/code-tara.db
```

If the file doesn't exist yet, the backend creates it on first start.

### Clone times out

Large repos can take a while. The timeout is 300 seconds. For very large repos:
- Edit `CLONE_TIMEOUT` in `backend/app/github/clone_manager.py`
- Or delete `repos/{owner}/{repo}/` and retry

### "Cannot be launched inside another Claude Code session"

The `CLAUDECODE` env var is automatically stripped before each `claude` subprocess call. If you're still seeing this, make sure you're running the latest version of the backend.

### Backend won't start

Check that `uv` is installed and the virtualenv was created:
```bash
cd backend && uv sync && uv run uvicorn app.main:app --reload
```

---

## Data locations

| Path | Contents |
|------|----------|
| `data/code-tara.db` | SQLite database (all reviews, chunks, drafts, threads) |
| `repos/{owner}/{repo}/` | Shallow clones for AI file access |

Both are gitignored. Delete them to start fresh:
```bash
make clean   # also removes node_modules and .venv
```
