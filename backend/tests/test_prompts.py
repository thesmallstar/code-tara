"""Tests for the prompts/instructions API."""

import json
from pathlib import Path
from unittest.mock import patch

import pytest

from app.ai.prompts import DEFAULTS, get_prompt, get_all_prompts, update_prompt, reset_prompt


@pytest.fixture(autouse=True)
def isolated_prompts(tmp_path):
    """Redirect prompt storage to a temp dir so tests don't touch real data."""
    prompts_file = tmp_path / "prompts.json"
    with patch("app.ai.prompts._PROMPTS_FILE", prompts_file), \
         patch("app.ai.prompts._DATA_DIR", tmp_path):
        yield prompts_file


class TestPromptStore:
    def test_get_prompt_returns_default(self):
        text = get_prompt("plan_chunks")
        assert text == DEFAULTS["plan_chunks"]["text"]

    def test_get_prompt_unknown_key_raises(self):
        with pytest.raises(KeyError):
            get_prompt("nonexistent")

    def test_update_and_get_prompt(self):
        update_prompt("chat", "Be very brief.")
        assert get_prompt("chat") == "Be very brief."

    def test_update_unknown_key_raises(self):
        with pytest.raises(KeyError):
            update_prompt("nonexistent", "text")

    def test_reset_prompt(self):
        update_prompt("chat", "Custom text")
        assert get_prompt("chat") == "Custom text"
        reset_prompt("chat")
        assert get_prompt("chat") == DEFAULTS["chat"]["text"]

    def test_reset_unknown_key_raises(self):
        with pytest.raises(KeyError):
            reset_prompt("nonexistent")

    def test_get_all_prompts_returns_all_keys(self):
        prompts = get_all_prompts()
        keys = {p["key"] for p in prompts}
        assert keys == set(DEFAULTS.keys())

    def test_get_all_prompts_marks_custom(self):
        update_prompt("chat", "Custom")
        prompts = get_all_prompts()
        chat = next(p for p in prompts if p["key"] == "chat")
        plan = next(p for p in prompts if p["key"] == "plan_chunks")
        assert chat["is_custom"] is True
        assert plan["is_custom"] is False

    def test_persistence_across_calls(self, isolated_prompts):
        update_prompt("pr_summary", "Short summary only.")
        assert isolated_prompts.exists()
        data = json.loads(isolated_prompts.read_text())
        assert data["pr_summary"] == "Short summary only."


class TestPromptsAPI:
    def test_list_prompts(self, client):
        res = client.get("/api/prompts")
        assert res.status_code == 200
        data = res.json()
        assert len(data) == len(DEFAULTS)
        assert all("key" in p and "text" in p and "label" in p for p in data)

    def test_get_single_prompt(self, client):
        res = client.get("/api/prompts/chat")
        assert res.status_code == 200
        data = res.json()
        assert data["key"] == "chat"
        assert data["text"] == DEFAULTS["chat"]["text"]

    def test_get_unknown_prompt_404(self, client):
        res = client.get("/api/prompts/nonexistent")
        assert res.status_code == 404

    def test_update_prompt(self, client):
        res = client.put("/api/prompts/chat", json={"text": "Be terse."})
        assert res.status_code == 200

        res = client.get("/api/prompts/chat")
        assert res.json()["text"] == "Be terse."

    def test_update_unknown_prompt_404(self, client):
        res = client.put("/api/prompts/nonexistent", json={"text": "x"})
        assert res.status_code == 404

    def test_reset_prompt(self, client):
        client.put("/api/prompts/chat", json={"text": "Custom"})
        res = client.delete("/api/prompts/chat")
        assert res.status_code == 200
        assert res.json()["text"] == DEFAULTS["chat"]["text"]

    def test_reset_unknown_prompt_404(self, client):
        res = client.delete("/api/prompts/nonexistent")
        assert res.status_code == 404
