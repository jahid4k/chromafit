from __future__ import annotations

import structlog
from fastapi import APIRouter, HTTPException

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