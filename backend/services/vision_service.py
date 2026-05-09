from __future__ import annotations

import base64
import json
from typing import Any, Dict, List

import structlog
from openai import AsyncOpenAI

from config import settings
import httpx
from openai import APITimeoutError, APIConnectionError

logger = structlog.get_logger(__name__)

SYSTEM_PROMPT = """You are a professional fashion stylist and color theory expert.

Analyze each clothing image and return structured data. Here are examples of perfect responses:

EXAMPLE — Dark knitwear:
{
  "image_index": 0,
  "clothing_type": "crew-neck sweater",
  "clothing_subtype": "knitwear",
  "dominant_colors": ["#2C3E50", "#34495E"],
  "color_names": ["Charcoal Navy", "Slate Blue"],
  "texture_notes": "ribbed wool",
  "season_suitability": ["autumn", "winter"],
  "confidence": "high"
}

EXAMPLE — Light footwear:
{
  "image_index": 1,
  "clothing_type": "white leather sneakers",
  "clothing_subtype": "footwear",
  "dominant_colors": ["#F5F5F5", "#E8E8E8"],
  "color_names": ["Off White", "Light Grey"],
  "texture_notes": "smooth leather",
  "season_suitability": ["spring", "summer", "autumn"],
  "confidence": "high"
}

EXAMPLE — Patterned item (extract dominant base color, ignore pattern):
{
  "image_index": 2,
  "clothing_type": "striped oxford shirt",
  "clothing_subtype": "tops",
  "dominant_colors": ["#F5F0E8", "#2C5F8A"],
  "color_names": ["Warm White", "French Blue"],
  "texture_notes": "crisp cotton",
  "season_suitability": ["spring", "summer"],
  "confidence": "high"
}

Rules:
- Analyze each image INDEPENDENTLY
- Return ONLY valid JSON, no markdown, no explanation
- dominant_colors: most dominant first, ignore shadows and background
- If image is unclear, set confidence to "low" and do your best

Return this exact structure:
{
  "items": [ ...one object per image... ]
}

IMPORTANT — if an image is not a clothing item:
- Set clothing_type to "non-clothing"
- Set clothing_subtype to "unknown"  
- Set dominant_colors to ["#808080"]
- Set color_names to ["Unknown"]
- Set texture_notes to "not a clothing item"
- Set season_suitability to []
- Set confidence to "low"

Never skip an image. Every image must have an entry, even if unrecognizable.
"""

RETRY_SUFFIX = (
    "Your previous response was not valid JSON. Respond with ONLY the JSON object, "
    "starting with { and ending with }. No other characters."
)


class VisionServiceError(Exception):
    pass


def _build_content(
    images: List[bytes], mime_types: List[str], extra_text: str = ""
) -> List[Dict[str, Any]]:
    """Build the content array for the vLLM multimodal request."""
    content: List[Dict[str, Any]] = []

    for idx, (img_bytes, mime_type) in enumerate(zip(images, mime_types)):
        b64 = base64.b64encode(img_bytes).decode("utf-8")
        content.append(
            {
                "type": "text",
                "text": f"Image {idx} (0-indexed):",
            }
        )
        content.append(
            {
                "type": "image_url",
                "image_url": {
                    "url": f"data:{mime_type};base64,{b64}",
                },
            }
        )

    user_text = "Analyze each wardrobe item image above and return the JSON."
    if extra_text:
        user_text = extra_text
    content.append({"type": "text", "text": user_text})
    return content

def _extract_json(raw: str) -> str:
    cleaned = raw.strip()

    # Remove markdown fences first
    if "```" in cleaned:              # ← checks anywhere in string, not just start
        parts = cleaned.split("```")
        for part in parts:
            part = part.strip()
            if part.startswith("json"):
                part = part[4:].strip()
            if part.startswith("{"):
                cleaned = part
                break

    # Then find actual JSON boundaries
    start = cleaned.find("{")         # ← finds first {
    end = cleaned.rfind("}")          # ← finds last }
    if start != -1 and end != -1 and end > start:
        cleaned = cleaned[start:end + 1]  # ← slices out just the JSON

    return cleaned.strip()

def _validate_items(items: list, expected_count: int) -> list:
    """
    Ensure we got an entry for every image.
    If model skipped images, insert placeholder entries.
    """
    found_indices = {item["image_index"] for item in items}
    
    for i in range(expected_count):
        if i not in found_indices:
            logger.warning("vision_missing_image_index", index=i)
            items.append({
                "image_index": i,
                "clothing_type": "unknown",
                "clothing_subtype": "unknown",
                "dominant_colors": ["#808080"],
                "color_names": ["Unknown"],
                "texture_notes": "analysis failed",
                "season_suitability": [],
                "confidence": "low"
            })
    
    # Sort by image_index so order is always consistent
    return sorted(items, key=lambda x: x["image_index"])

async def analyze_wardrobe_images(
    images: List[bytes], mime_types: List[str]
) -> List[Dict[str, Any]]:
    """
    Send all wardrobe images to Qwen2.5-VL in a single request.
    Returns the list of item analysis dicts.
    Retries once on JSON parse failure.
    Raises VisionServiceError on second failure.
    """
    client = AsyncOpenAI(
        api_key="not-needed",
        base_url=f"http://{settings.vllm_host}:{settings.vllm_port}/v1",
        timeout=httpx.Timeout(
            connect=10.0,
            read=120.0,   # vLLM inference on 10 images can take 60-90s
            write=10.0,
            pool=5.0,
        ),
    )

    async def _call(extra_text: str = "") -> str:
        content = _build_content(images, mime_types, extra_text)
        try:
            response = await client.chat.completions.create(
                model=settings.vllm_model,
                max_tokens=1000,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": content},
                ],
            )
        except APITimeoutError as exc:
            logger.error("vision_timeout", error=str(exc))
            raise VisionServiceError(
                "vLLM request timed out. The inference server may be under load or unreachable."
            ) from exc
        except APIConnectionError as exc:
            logger.error("vision_connection_error", error=str(exc))
            raise VisionServiceError(
                f"Cannot connect to vLLM at {settings.vllm_host}:{settings.vllm_port}. "
                "Check VLLM_HOST and VLLM_PORT environment variables."
            ) from exc
        return response.choices[0].message.content or ""

    # First attempt
    try:
        raw = await _call()
        logger.debug("vision_raw_response", length=len(raw))
        cleaned = _extract_json(raw)
        data = json.loads(cleaned)
        items: List[Dict[str, Any]] = data["items"]
        items = _validate_items(items, expected_count=len(images))
        logger.info("vision_analysis_success", item_count=len(items))
        return items
    except (json.JSONDecodeError, KeyError) as exc:
        logger.warning("vision_json_parse_failed_attempt_1", error=str(exc))

    # Second attempt with retry suffix
    try:
        raw = await _call(extra_text=RETRY_SUFFIX)
        # Strip markdown fences if model ignores instructions
        cleaned = _extract_json(raw)
        data = json.loads(cleaned)
        items = data["items"]
        items = _validate_items(items, expected_count=len(images))
        logger.info("vision_analysis_success_retry", item_count=len(items))
        return items
    
    except (json.JSONDecodeError, KeyError) as exc:
        logger.error("vision_json_parse_failed_attempt_2", error=str(exc))
        raise VisionServiceError(
            "Qwen2.5-VL returned invalid JSON on two consecutive attempts."
        ) from exc
    except Exception as exc:
        logger.error("vision_unexpected_error", error=str(exc))
        raise VisionServiceError(f"Vision service call failed: {exc}") from exc