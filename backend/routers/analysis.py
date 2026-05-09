from __future__ import annotations

import asyncio
import time
import uuid
from datetime import datetime, timezone
from typing import List, Optional

import structlog
from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from config import settings
from db import mongo
from models.response_models import AnalyzeResponse, WardrobeItem
from services import outfit_service, palette_service, vision_service
from services.storage_service import StorageServiceError, upload_image

router = APIRouter()
logger = structlog.get_logger(__name__)

_ACCEPTED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}


def _validate_images(images: List[UploadFile], base_item_index: Optional[int]) -> None:
    """Validate uploaded images and base_item_index. Raises HTTPException on failure."""
    if len(images) < 3:
        raise HTTPException(
            status_code=422,
            detail=f"At least 3 images are required. You uploaded {len(images)}.",
        )
    if len(images) > settings.max_images_per_request:
        raise HTTPException(
            status_code=422,
            detail=f"Maximum {settings.max_images_per_request} images allowed. You uploaded {len(images)}.",
        )

    for img in images:
        if img.content_type not in _ACCEPTED_MIME_TYPES:
            raise HTTPException(
                status_code=422,
                detail=f"File '{img.filename}' has unsupported type '{img.content_type}'. "
                       f"Accepted types: JPEG, PNG, WEBP.",
            )

    if base_item_index is not None:
        if not (0 <= base_item_index < len(images)):
            raise HTTPException(
                status_code=422,
                detail=f"base_item_index {base_item_index} is out of range. "
                       f"Valid range: 0 to {len(images) - 1}.",
            )


@router.post("/api/analyze", response_model=AnalyzeResponse)
async def analyze_wardrobe(
    images: List[UploadFile] = File(..., description="3–10 wardrobe item images"),
    base_item_index: Optional[int] = Form(
        default=None,
        description="0-based index of the anchor item. Omit for free mode.",
    ),
) -> AnalyzeResponse:
    start_ms = time.monotonic()
    log = logger.bind(image_count=len(images), base_item_index=base_item_index)
    log.info("analyze_request_received")

    # --- Validation ---
    _validate_images(images, base_item_index)

    # --- Read image bytes (validate size here too) ---
    image_bytes_list: List[bytes] = []
    mime_types: List[str] = []
    filenames: List[str] = []

    for img in images:
        raw = await img.read()
        if len(raw) > settings.max_image_size_bytes:
            raise HTTPException(
                status_code=422,
                detail=f"File '{img.filename}' exceeds the {settings.max_image_size_mb}MB size limit.",
            )
        image_bytes_list.append(raw)
        mime_types.append(img.content_type or "image/jpeg")
        filenames.append(img.filename or f"image_{len(filenames)}.jpg")

    # --- Upload to Cloudinary (parallel) ---
    try:
        upload_tasks = [
            upload_image(b, fn) for b, fn in zip(image_bytes_list, filenames)
        ]
        upload_results = await asyncio.gather(*upload_tasks)
        cloudinary_urls = [r[0] for r in upload_results]
        cloudinary_public_ids = [r[1] for r in upload_results]
    except StorageServiceError as exc:
        log.error("cloudinary_upload_error", error=str(exc))
        raise HTTPException(status_code=502, detail=f"Image upload failed: {exc}")

    # --- Vision analysis (single vLLM call with all images) ---
    try:
        vision_items = await vision_service.analyze_wardrobe_images(
            image_bytes_list, mime_types
        )
    except vision_service.VisionServiceError as exc:
        log.error("vision_analysis_error", error=str(exc))
        raise HTTPException(status_code=502, detail=f"Vision analysis failed: {exc}")

    # --- MOCK_VISION (for testing without vLLM) ---
    

    # --- Merge vision results with upload results ---
    wardrobe_items: List[WardrobeItem] = []
    for idx in range(len(images)):
        # Find matching vision result by image_index, fall back to positional
        vision_data = next(
            (v for v in vision_items if v.get("image_index") == idx),
            vision_items[idx] if idx < len(vision_items) else {},
        )
        wardrobe_items.append(
            WardrobeItem(
                image_index=idx,
                filename=filenames[idx],
                cloudinary_url=cloudinary_urls[idx],
                clothing_type=vision_data.get("clothing_type", "Unknown item"),
                clothing_subtype=vision_data.get("clothing_subtype", "unknown"),
                dominant_colors=vision_data.get("dominant_colors", []),
                color_names=vision_data.get("color_names", []),
                texture_notes=vision_data.get("texture_notes", ""),
                season_suitability=vision_data.get("season_suitability", []),
                anchor=(idx == base_item_index),
            )
        )

    # --- Palette matching + outfit combination ---
    items_dicts = [item.model_dump() for item in wardrobe_items]
    outfit_combinations = outfit_service.generate_outfit_combinations(
        items=items_dicts,
        base_item_index=base_item_index,
        top_k=5,
    )

    mode = "anchored" if base_item_index is not None else "free"
    session_id = str(uuid.uuid4())
    processing_time_ms = int((time.monotonic() - start_ms) * 1000)

    # --- Persist to MongoDB ---
    session_doc = {
        "session_id": session_id,
        "created_at": datetime.now(timezone.utc),
        "mode": mode,
        "base_item_index": base_item_index,
        "image_count": len(images),
        "items": [
            {
                **item.model_dump(),
                "cloudinary_public_id": cloudinary_public_ids[item.image_index],
            }
            for item in wardrobe_items
        ],
        "outfit_combinations": [c.model_dump() for c in outfit_combinations],
        "processing_time_ms": processing_time_ms,
    }
    try:
        await mongo.insert_session(session_doc)
    except Exception as exc:
        # Non-fatal — return result even if DB write fails
        log.error("session_persist_failed", error=str(exc))

    response = AnalyzeResponse(
        session_id=session_id,
        mode=mode,
        base_item_index=base_item_index,
        items=wardrobe_items,
        outfit_combinations=outfit_combinations,
        processing_time_ms=processing_time_ms,
    )

    log.info(
        "analyze_complete",
        session_id=session_id,
        mode=mode,
        processing_time_ms=processing_time_ms,
    )

    return response