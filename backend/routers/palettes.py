import structlog
from fastapi import APIRouter, HTTPException

from services.palette_service import get_all_palettes

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/api", tags=["palettes"])


@router.get("/api/palettes")
async def list_palettes() -> dict:
    """
    Return the full Sanzo Wada palette library.
    Data is loaded once at startup and cached in palette_service — no I/O per request.
    """
    try:
        palettes = get_all_palettes()
        return {"palettes": palettes, "count": len(palettes)}
    except Exception as exc:
        logger.error("palettes.list_failed", error=str(exc))
        raise HTTPException(status_code=500, detail="Failed to load palette library.") from exc