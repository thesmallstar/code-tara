-include .env
export

.PHONY: install dev kill frontend backend clean migrate makemigration test seed-opengrep-rules

install:
	cd frontend && npm install
	cd backend && uv sync

kill:
	-lsof -ti :$${BACKEND_PORT:-8000} | xargs kill -9 2>/dev/null || true
	-lsof -ti :$${FRONTEND_PORT:-3000} | xargs kill -9 2>/dev/null || true

dev: kill
	$(MAKE) -j2 frontend backend

frontend:
	cd frontend && npm run dev

backend:
	cd backend && uv run uvicorn app.main:app --reload --host 0.0.0.0 --port $${BACKEND_PORT:-8000}

test:
	cd backend && uv run pytest tests/ -v

# Clone (or update) the opengrep rules registry for the opengrep scanner.
# Rules land at OPENGREP_RULES_PATH (default ~/opengrep-rules); they are
# user-supplied because of their Commons Clause license — never vendored.
seed-opengrep-rules:
	@RULES="$${OPENGREP_RULES_PATH:-$$HOME/opengrep-rules}"; \
	if [ -d "$$RULES/.git" ] || [ -d "$$(readlink "$$RULES" 2>/dev/null)/.git" ]; then \
		echo "Updating opengrep rules at $$RULES"; \
		git -C "$$RULES" pull --ff-only; \
	else \
		echo "Cloning opengrep rules to $$RULES"; \
		git clone --depth 1 https://github.com/opengrep/opengrep-rules "$$RULES"; \
	fi

migrate:
	cd backend && uv run alembic upgrade head

makemigration:
	cd backend && uv run alembic revision --autogenerate -m "$(name)"

clean:
	rm -rf frontend/node_modules frontend/dist backend/.venv data/code-tara.db
