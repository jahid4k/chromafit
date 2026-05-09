from __future__ import annotations

import json
import os
from typing import List, Dict, Any

import numpy as np
import structlog
from colormath.color_objects import sRGBColor, LabColor
from colormath.color_conversions import convert_color
from colormath.color_diff import delta_e_cie2000

from models.response_models import MatchedPalette, PaletteColor

# colormath uses numpy.asscalar which was removed in NumPy 1.24+
if not hasattr(np, 'asscalar'):
    np.asscalar = lambda a: a.item()

logger = structlog.get_logger(__name__)

# ---------------------------------------------------------------------------
# Module-level palette cache — loaded once at startup
# ---------------------------------------------------------------------------

_PALETTES: List[Dict[str, Any]] = []
_VALID_COMBINATION_TYPES = {
    "analogous",
    "complementary",
    "triadic",
    "split-complementary",
    "monochromatic",
    "neutral",
}

DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "sanzo_wada_palettes.json")


def _hex_to_lab(hex_color: str) -> LabColor:
    """Convert a hex color string to CIELAB color space."""
    hex_color = hex_color.lstrip("#")
    r = int(hex_color[0:2], 16) / 255.0
    g = int(hex_color[2:4], 16) / 255.0
    b = int(hex_color[4:6], 16) / 255.0
    rgb = sRGBColor(r, g, b, is_upscaled=False)
    return convert_color(rgb, LabColor)


def _validate_palette(palette: Dict[str, Any], idx: int) -> bool:
    """Validate a single palette entry. Returns True if valid."""
    required_fields = ["palette_id", "palette_name", "combination_type", "mood_tags", "colors"]
    for field in required_fields:
        if field not in palette:
            logger.warning("palette_missing_field", index=idx, field=field)
            return False

    if not isinstance(palette["palette_id"], int):
        logger.warning("palette_invalid_id_type", index=idx, palette_id=palette.get("palette_id"))
        return False

    if palette["combination_type"] not in _VALID_COMBINATION_TYPES:
        logger.warning(
            "palette_invalid_combination_type",
            index=idx,
            palette_id=palette["palette_id"],
            combination_type=palette["combination_type"],
        )
        return False

    mood_tags = palette.get("mood_tags", [])
    if not isinstance(mood_tags, list) or len(mood_tags) < 2 or len(mood_tags) > 4:
        logger.warning(
            "palette_invalid_mood_tags",
            index=idx,
            palette_id=palette["palette_id"],
        )
        return False

    colors = palette.get("colors", [])
    if not isinstance(colors, list) or not (2 <= len(colors) <= 6):
        logger.warning(
            "palette_invalid_colors_count",
            index=idx,
            palette_id=palette["palette_id"],
            count=len(colors),
        )
        return False

    for color in colors:
        hex_val = color.get("hex", "")
        if not (
            isinstance(hex_val, str)
            and hex_val.startswith("#")
            and len(hex_val) == 7
        ):
            logger.warning(
                "palette_invalid_hex",
                index=idx,
                palette_id=palette["palette_id"],
                hex=hex_val,
            )
            return False

    return True


def load_palettes() -> None:
    """Load and validate the Sanzo Wada palette JSON file at startup."""
    global _PALETTES
    abs_path = os.path.abspath(DATA_PATH)
    logger.info("palette_loading", path=abs_path)

    with open(abs_path, "r", encoding="utf-8") as f:
        raw: List[Dict[str, Any]] = json.load(f)

    valid: List[Dict[str, Any]] = []
    for idx, palette in enumerate(raw):
        if _validate_palette(palette, idx):
            valid.append(palette)
        else:
            logger.warning("palette_skipped", index=idx, palette_id=palette.get("palette_id"))

    _PALETTES = valid
    logger.info("palette_loaded", count=len(_PALETTES))


def get_palettes() -> List[Dict[str, Any]]:
    return _PALETTES


# ---------------------------------------------------------------------------
# Core matching logic
# ---------------------------------------------------------------------------


def _min_delta_e_to_palette(item_hex: str, palette: Dict[str, Any]) -> float:
    """Compute the minimum Delta-E (CIE2000) between an item color and any palette color."""
    item_lab = _hex_to_lab(item_hex)
    min_de = float("inf")
    for color in palette["colors"]:
        palette_lab = _hex_to_lab(color["hex"])
        de = delta_e_cie2000(item_lab, palette_lab)
        if de < min_de:
            min_de = de
    return min_de


def find_best_palettes_for_colors(
    hex_colors: List[str], top_n: int = 3
) -> List[Dict[str, Any]]:
    """
    Return the top_n palettes that best match the given list of hex colors.
    Match score = average of min-Delta-E for each input color against the palette.
    Lower score = better match.
    """
    scored: List[tuple[float, Dict[str, Any]]] = []

    for palette in _PALETTES:
        total_de = 0.0
        for hex_color in hex_colors:
            total_de += _min_delta_e_to_palette(hex_color, palette)
        avg_de = total_de / max(len(hex_colors), 1)
        scored.append((avg_de, palette))

    scored.sort(key=lambda x: x[0])
    return [p for _, p in scored[:top_n]]


def find_best_palette_for_combination(
    all_item_colors: List[List[str]],
    item_indices: List[int],
    anchor_palette: Dict[str, Any] | None = None,
) -> tuple[Dict[str, Any], float]:
    """
    Find the best matching palette for a combination of items.

    If anchor_palette is provided (anchored mode), score every palette but
    weight the anchor palette's score to give it priority.

    Returns (best_palette, raw_avg_delta_e).
    """
    combined_colors: List[str] = []
    for idx in item_indices:
        combined_colors.extend(all_item_colors[idx])

    if not combined_colors:
        return _PALETTES[0], 100.0

    best_palette = _PALETTES[0]
    best_de = float("inf")

    for palette in _PALETTES:
        total_de = 0.0
        for hex_color in combined_colors:
            total_de += _min_delta_e_to_palette(hex_color, palette)
        avg_de = total_de / max(len(combined_colors), 1)

        # In anchored mode, strongly prefer the anchor's best palette
        if anchor_palette and palette["palette_id"] == anchor_palette["palette_id"]:
            avg_de *= 0.7  # 30% bonus for staying in the anchor palette

        if avg_de < best_de:
            best_de = avg_de
            best_palette = palette

    return best_palette, best_de


def delta_e_to_harmony_score(avg_de: float) -> int:
    """
    Convert an average Delta-E value to a 0–100 harmony score.
    Delta-E 0 = perfect match (100 score). Delta-E ≥ 50 = poor match (0 score).
    """
    clamped = max(0.0, min(avg_de, 50.0))
    score = int((1.0 - clamped / 50.0) * 80)  # caps at 80; bonuses push higher
    return score


def palette_to_response(palette: Dict[str, Any]) -> MatchedPalette:
    return MatchedPalette(
        palette_id=palette["palette_id"],
        palette_name=palette["palette_name"],
        combination_type=palette["combination_type"],
        mood_tags=palette["mood_tags"],
        colors=[PaletteColor(hex=c["hex"], name=c["name"]) for c in palette["colors"]],
    )