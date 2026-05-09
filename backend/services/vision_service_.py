from __future__ import annotations

import base64
import json
from typing import Any, Dict, List

import structlog
from openai import AsyncOpenAI

from config import settings

logger = structlog.get_logger(__name__)

SYSTEM_PROMPT = """You are a professional fashion stylist and color theory expert analyzing wardrobe items for outfit recommendation.

You will receive multiple clothing item images. For each image, analyze independently and extract:

- clothing_type: specific item category (e.g., "crew-neck sweater", "slim-fit chinos", "oxford shirt", "leather chelsea boots")
- clothing_subtype: more specific descriptor (e.g., "knitwear", "trousers", "tops", "footwear")
- dominant_colors: array of 1-3 dominant hex color codes (most to least dominant), e.g. ["#2C3E50", "#BDC3C7"]
- color_names: human-readable names for each hex color (e.g., ["Charcoal Navy", "Ash Grey"])
- texture_notes: brief note on texture/material if visible (e.g., "matte cotton", "glossy leather", "ribbed knit")
- season_suitability: array of applicable seasons ["spring", "summer", "autumn", "winter"]

After analyzing all items individually, do not recommend combinations — that is handled separately.

Respond ONLY with valid JSON matching this exact schema. No preamble, no markdown fences, no explanation outside the JSON:

{
  "items": [
    {
      "image_index": 0,
      "clothing_type": "slim-fit chinos",
      "clothing_subtype": "trousers",
      "dominant_colors": ["#C4A882", "#B8976A"],
      "color_names": ["Sand Beige", "Warm Tan"],
      "texture_notes": "matte cotton twill",
      "season_suitability": ["spring", "summer", "autumn"]
    }
  ]
}"""

RETRY_SUFFIX = (
    "Your previous response was not valid JSON. Respond with ONLY the JSON object, "
    "starting with { and ending with }. No other characters."
)

# ---------------------------------------------------------------------------
# Mock data — used when settings.mock_vision is True
# ---------------------------------------------------------------------------

_MOCK_ITEMS: List[Dict[str, Any]] = [
    {
        "image_index": 0,
        "clothing_type": "crew-neck sweater",
        "clothing_subtype": "knitwear",
        "dominant_colors": ["#2C3E50", "#34495E"],
        "color_names": ["Charcoal Navy", "Slate Blue"],
        "texture_notes": "ribbed knit",
        "season_suitability": ["autumn", "winter"],
    },
    {
        "image_index": 1,
        "clothing_type": "slim-fit chinos",
        "clothing_subtype": "trousers",
        "dominant_colors": ["#C4A882"],
        "color_names": ["Sand Beige"],
        "texture_notes": "matte cotton twill",
        "season_suitability": ["spring", "summer", "autumn"],
    },
    {
        "image_index": 2,
        "clothing_type": "leather chelsea boots",
        "clothing_subtype": "footwear",
        "dominant_colors": ["#3B1F0A"],
        "color_names": ["Dark Espresso"],
        "texture_notes": "glossy leather",
        "season_suitability": ["autumn", "winter"],
    },
    {
        "image_index": 3,
        "clothing_type": "oxford button-down shirt",
        "clothing_subtype": "tops",
        "dominant_colors": ["#F5F0E8"],
        "color_names": ["Warm White"],
        "texture_notes": "crisp cotton",
        "season_suitability": ["spring", "summer", "autumn"],
    },
    {
        "image_index": 4,
        "clothing_type": "wool overcoat",
        "clothing_subtype": "outerwear",
        "dominant_colors": ["#5C5346"],
        "color_names": ["Warm Charcoal"],
        "texture_notes": "heavy wool",
        "season_suitability": ["autumn", "winter"],
    },
    {
        "image_index": 5,
        "clothing_type": "slim-fit dark jeans",
        "clothing_subtype": "trousers",
        "dominant_colors": ["#1A1A2E"],
        "color_names": ["Midnight Indigo"],
        "texture_notes": "denim",
        "season_suitability": ["spring", "autumn", "winter"],
    },
    {
        "image_index": 6,
        "clothing_type": "linen blazer",
        "clothing_subtype": "outerwear",
        "dominant_colors": ["#D4C5A9"],
        "color_names": ["Pale Linen"],
        "texture_notes": "textured linen",
        "season_suitability": ["spring", "summer"],
    },
    {
        "image_index": 7,
        "clothing_type": "white t-shirt",
        "clothing_subtype": "tops",
        "dominant_colors": ["#F8F8F8"],
        "color_names": ["Pure White"],
        "texture_notes": "soft jersey cotton",
        "season_suitability": ["spring", "summer", "autumn", "winter"],
    },
    {
        "image_index": 8,
        "clothing_type": "suede loafers",
        "clothing_subtype": "footwear",
        "dominant_colors": ["#8B6F5E"],
        "color_names": ["Dusty Tan"],
        "texture_notes": "matte suede",
        "season_suitability": ["spring", "summer", "autumn"],
    },
    {
        "image_index": 9,
        "clothing_type": "merino turtleneck",
        "clothing_subtype": "knitwear",
        "dominant_colors": ["#704241"],
        "color_names": ["Burgundy Clay"],
        "texture_notes": "fine merino wool",
        "season_suitability": ["autumn", "winter"],
    },
]


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
    # --- Mock mode (no GPU needed) ---
    if settings.mock_vision:
        image_count = len(images)
        mock_result = _MOCK_ITEMS[:image_count]
        logger.info("vision_mock_response", image_count=image_count)
        return mock_result

    # --- Real vLLM path ---
    client = AsyncOpenAI(
        api_key="not-needed",
        base_url=settings.vllm_base_url,
    )

    async def _call(extra_text: str = "") -> str:
        content = _build_content(images, mime_types, extra_text)
        response = await client.chat.completions.create(
            model=settings.vllm_model,
            max_tokens=1000,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": content},
            ],
        )
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