from __future__ import annotations

import structlog
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import IndexModel, ASCENDING

from config import settings

logger = structlog.get_logger(__name__)

_client: AsyncIOMotorClient | None = None
_db: AsyncIOMotorDatabase | None = None


async def connect_db() -> None:
    global _client, _db
    _client = AsyncIOMotorClient(settings.mongodb_url)
    _db = _client[settings.mongodb_db_name]
    await _ensure_indexes()
    logger.info("mongodb_connected", db=settings.mongodb_db_name)


async def disconnect_db() -> None:
    global _client
    if _client is not None:
        _client.close()
        logger.info("mongodb_disconnected")


async def _ensure_indexes() -> None:
    db = get_db()
    await db["sessions"].create_indexes(
        [IndexModel([("session_id", ASCENDING)], unique=True)]
    )
    logger.info("mongodb_indexes_ensured")


def get_db() -> AsyncIOMotorDatabase:
    if _db is None:
        raise RuntimeError("Database not connected. Call connect_db() first.")
    return _db


# ---------------------------------------------------------------------------
# Query helpers
# ---------------------------------------------------------------------------


async def insert_session(document: dict) -> str:
    db = get_db()
    result = await db["sessions"].insert_one(document)
    return str(result.inserted_id)


async def get_session_by_id(session_id: str) -> dict | None:
    db = get_db()
    doc = await db["sessions"].find_one({"session_id": session_id}, {"_id": 0})
    return doc