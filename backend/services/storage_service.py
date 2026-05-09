from __future__ import annotations

import asyncio

import cloudinary
import cloudinary.uploader
import structlog

from config import settings

logger = structlog.get_logger(__name__)

# Configure Cloudinary once at import time
cloudinary.config(
    cloud_name=settings.cloudinary_cloud_name,
    api_key=settings.cloudinary_api_key,
    api_secret=settings.cloudinary_api_secret,
    secure=True,
)


class StorageServiceError(Exception):
    pass


async def upload_image(image_bytes: bytes, filename: str) -> tuple[str, str]:
    """
    Upload image bytes to Cloudinary asynchronously.
    Returns (secure_url, public_id).
    """
    try:
        result = await asyncio.to_thread(
            cloudinary.uploader.upload,
            image_bytes,
            folder=settings.cloudinary_folder,
            resource_type="image",
            use_filename=True,
            unique_filename=True,
        )
        secure_url: str = result["secure_url"]
        public_id: str = result["public_id"]
        logger.info("cloudinary_upload_success", filename=filename, public_id=public_id)
        return secure_url, public_id
    except Exception as exc:
        logger.error("cloudinary_upload_failed", filename=filename, error=str(exc))
        raise StorageServiceError(f"Failed to upload {filename}: {exc}") from exc