from __future__ import annotations

import structlog
from fastapi import APIRouter, HTTPException, Query

from db.mongo import get_sessions_list
from db import mongo
from models.response_models import SessionResponse

router = APIRouter()
logger = structlog.get_logger(__name__)


@router.get("/api/sessions/{session_id}", response_model=SessionResponse)
async def get_session(session_id: str) -> SessionResponse:
    log = logger.bind(session_id=session_id)
    log.info("session_fetch_request")

    try:
        doc = await mongo.get_session_by_id(session_id)
    except Exception as exc:
        log.error("session_db_error", error=str(exc))
        raise HTTPException(status_code=500, detail="Database error while fetching session.")

    if doc is None:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found.")

    try:
        response = SessionResponse(**doc)
    except Exception as exc:
        log.error("session_parse_error", error=str(exc))
        raise HTTPException(status_code=500, detail="Failed to parse stored session data.")

    log.info("session_fetch_success")
    return response


@router.get("/api/sessions")
async def list_sessions(
    page: int = Query(default=1, ge=1, description="Page number, 1-based"),
    page_size: int = Query(default=12, ge=1, le=50, description="Results per page"),
) -> dict:
    """
    Return a paginated list of all sessions, newest first.
    Each entry is a summary — not the full session document.
    """
    try:
        skip = (page - 1) * page_size
        sessions, total = await get_sessions_list(skip=skip, limit=page_size)
    except Exception as exc:
        logger.error("sessions.list_failed", error=str(exc))
        raise HTTPException(status_code=500, detail="Failed to retrieve sessions list.") from exc

    total_pages = max(1, -(-total // page_size))  # ceiling division

    return {
        "sessions": sessions,
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_prev": page > 1,
        },
    }