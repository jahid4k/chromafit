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

async def get_sessions_list(skip: int = 0, limit: int = 12) -> tuple[list[dict], int]:
    """
    Return a paginated list of session summaries, sorted newest first.
    Each summary contains only the fields needed for the sessions list page —
    not the full items/combinations arrays (those are large).
    """
    db = get_db()
    collection = db["sessions"]
 
    # Project only summary fields — avoids pulling large arrays over the wire
    projection = {
        "session_id": 1,
        "created_at": 1,
        "mode": 1,
        "base_item_index": 1,
        "image_count": 1,
        # First item thumbnail (anchor item if anchored, else first item)
        "items": {"$slice": 1},          # we pick the right one in the router
        # Top outfit only
        "outfit_combinations": {"$slice": 1},
        "_id": 0,
    }
 
    cursor = (
        collection.find({}, projection)
        .sort("created_at", -1)
        .skip(skip)
        .limit(limit)
    )
 
    sessions_raw = await cursor.to_list(length=limit)
    total = await collection.count_documents({})
 
    # Shape each raw document into a clean summary dict
    summaries = []
    for doc in sessions_raw:
        top_combo = doc.get("outfit_combinations", [None])[0]
        items = doc.get("items", [])
 
        # Find anchor item for thumbnail; fall back to first item
        anchor_item = next((it for it in items if it.get("anchor")), None)
        thumb_item = anchor_item or (items[0] if items else None)
 
        summaries.append({
            "session_id": doc["session_id"],
            "created_at": doc["created_at"].isoformat() if doc.get("created_at") else None,
            "mode": doc.get("mode", "free"),
            "image_count": doc.get("image_count", 0),
            "thumbnail_url": thumb_item["cloudinary_url"] if thumb_item else None,
            "thumbnail_type": thumb_item["clothing_type"] if thumb_item else None,
            "anchor": thumb_item.get("anchor", False) if thumb_item else False,
            "top_harmony_score": top_combo["harmony_score"] if top_combo else None,
            "top_palette_name": top_combo["matched_palette"]["palette_name"] if top_combo else None,
            "top_palette_colors": top_combo["matched_palette"]["colors"] if top_combo else [],
            "top_item_names": top_combo["item_names"] if top_combo else [],
        })
 
    return summaries, total