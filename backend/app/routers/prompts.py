from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.ai.prompts import get_all_prompts, get_prompt, update_prompt, reset_prompt, DEFAULTS

router = APIRouter(prefix="/api/prompts", tags=["prompts"])


class PromptUpdate(BaseModel):
    text: str


@router.get("")
def list_prompts():
    return get_all_prompts()


@router.get("/{key}")
def read_prompt(key: str):
    try:
        text = get_prompt(key)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Prompt '{key}' not found")
    default = DEFAULTS[key]
    return {"key": key, "label": default["label"], "description": default["description"], "text": text}


@router.put("/{key}")
def save_prompt(key: str, body: PromptUpdate):
    try:
        update_prompt(key, body.text)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Prompt '{key}' not found")
    return {"ok": True}


@router.delete("/{key}")
def delete_prompt(key: str):
    try:
        reset_prompt(key)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Prompt '{key}' not found")
    return {"ok": True, "text": DEFAULTS[key]["text"]}
