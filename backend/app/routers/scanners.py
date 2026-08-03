from fastapi import APIRouter

from app.scanners import list_scanners
from app.schemas import ScannerInfo

router = APIRouter(prefix="/api/scanners", tags=["scanners"])


@router.get("", response_model=list[ScannerInfo])
def get_scanners():
    """Available security scanners with install instructions for the ones
    whose binaries (or rules) are missing."""
    return list_scanners()
