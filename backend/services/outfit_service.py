from __future__ import annotations

import itertools
from typing import Any, Dict, List, Optional

import structlog

from models.response_models import OutfitCombination, MatchedPalette
from services import palette_service

logger = structlog.get_logger(__name__)

# ── Category maps — must match Qwen's actual clothing_subtype output ──────────
# Qwen returns broad subtypes like "bottoms", "tops", "footwear"
# We also include specific variants in case Qwen is more specific

_CATEGORY_MAP: Dict[str, str] = {
    # Tops
    "tops": "tops",
    "knitwear": "tops",
    "shirts": "tops",
    "outerwear": "tops",
    "jackets": "tops",
    "coats": "tops",
    "sweaters": "tops",
    "t-shirts": "tops",
    # Bottoms
    "bottoms": "bottoms",
    "trousers": "bottoms",
    "jeans": "bottoms",
    "shorts": "bottoms",
    "skirts": "bottoms",
    "pants": "bottoms",
    # Footwear
    "footwear": "footwear",
    "shoes": "footwear",
    "boots": "footwear",
    "sneakers": "footwear",
    "sandals": "footwear",
    "loafers": "footwear",
    # Accessories (optional additions to an outfit)
    "accessories": "accessories",
    "belts": "accessories",
    "scarves": "accessories",
    "hats": "accessories",
}


def _get_category(subtype: str) -> str:
    """Normalize a clothing_subtype to a broad category. Unknown = 'unknown'."""
    return _CATEGORY_MAP.get(subtype.lower().strip(), "unknown")


def _is_valid_combination(idx_set: List[int], items: List[Dict[str, Any]]) -> bool:
    """
    Hard rule: a valid outfit must have at most one item per clothing category.
    Also rejects any item marked as non-clothing.
    """
    seen_categories: set[str] = set()

    for i in idx_set:
        item = items[i]

        # Reject non-clothing items entirely
        if item.get("clothing_type", "").lower() == "non-clothing":
            return False

        subtype = item.get("clothing_subtype", "")
        category = _get_category(subtype)

        # Skip unknown category items — don't block the combo but don't count them
        if category == "unknown":
            continue

        # Reject if we already have an item in this category
        if category in seen_categories:
            return False

        seen_categories.add(category)

    # Must have at least 2 valid items after filtering
    return True


def _subtype_bonus(idx_set: List[int], items: List[Dict[str, Any]]) -> int:
    """
    Bonus points for outfit completeness:
    +15 if has top + bottom + footwear (complete outfit)
    +8  if has top + bottom or top + footwear
    +3  if has bottom + footwear
    """
    categories = set()
    for i in idx_set:
        subtype = items[i].get("clothing_subtype", "")
        cat = _get_category(subtype)
        if cat != "unknown":
            categories.add(cat)

    has_top = "tops" in categories
    has_bottom = "bottoms" in categories
    has_shoes = "footwear" in categories

    if has_top and has_bottom and has_shoes:
        return 15
    if has_top and has_bottom:
        return 8
    if has_top and has_shoes:
        return 5
    if has_bottom and has_shoes:
        return 3
    return 0


def _season_bonus(idx_set: List[int], items: List[Dict[str, Any]]) -> int:
    """Return +5 if all items share at least one season."""
    season_lists = [items[i].get("season_suitability", []) for i in idx_set]
    if not season_lists or any(len(s) == 0 for s in season_lists):
        return 0
    common = set(season_lists[0])
    for seasons in season_lists[1:]:
        common &= set(seasons)
    return 5 if common else 0


def _build_reasoning(
    item_names: List[str],
    palette: Dict[str, Any],
    anchor_name: Optional[str],
    mode: str,
    harmony_score: int,
) -> str:
    palette_name = palette["palette_name"]
    palette_id = palette["palette_id"]
    combination_type = palette["combination_type"]
    mood_tags = ", ".join(palette.get("mood_tags", []))
    items_str = ", ".join(f"the {n}" for n in item_names)

    if mode == "anchored" and anchor_name:
        others = [n for n in item_names if n != anchor_name]
        others_str = ", ".join(f"the {n}" for n in others)
        return (
            f"The {anchor_name} anchors this look within Wada's Palette {palette_id} — "
            f"\"{palette_name}\" — a {combination_type} grouping with a {mood_tags} character. "
            f"Pairing it with {others_str} reinforces the palette's color story, "
            f"yielding a harmony score of {harmony_score}/100."
        )
    else:
        return (
            f"Across {items_str}, ChromaFit matched Wada's Palette {palette_id} — "
            f"\"{palette_name}\" — a {combination_type} arrangement evoking {mood_tags}. "
            f"The combination achieves a harmony score of {harmony_score}/100 by leveraging "
            f"the palette's inherent color relationships."
        )


def generate_outfit_combinations(
    items: List[Dict[str, Any]],
    base_item_index: Optional[int] = None,
    top_k: int = 5,
) -> List[OutfitCombination]:
    """
    Generate and rank outfit combinations.

    FREE MODE     (base_item_index is None): all valid combinations of 2–4 items.
    ANCHORED MODE (base_item_index is int):  base item always included + 1–3 others.

    A valid combination:
      - Has at most one item per clothing category (no pant+pant)
      - Contains no non-clothing items
    """
    n = len(items)
    all_colors: List[List[str]] = [item.get("dominant_colors", []) for item in items]

    # Determine anchor palette (anchored mode only)
    anchor_palette: Optional[Dict[str, Any]] = None
    anchor_name: Optional[str] = None
    if base_item_index is not None and 0 <= base_item_index < n:
        anchor_colors = all_colors[base_item_index]
        if anchor_colors:
            best = palette_service.find_best_palettes_for_colors(anchor_colors, top_n=1)
            anchor_palette = best[0] if best else None
        anchor_name = items[base_item_index].get("clothing_type", f"Item {base_item_index}")

    # Build candidate index sets
    indices = list(range(n))
    raw_candidates: List[List[int]] = []

    if base_item_index is not None:
        others = [i for i in indices if i != base_item_index]
        for size in range(1, min(4, len(others)) + 1):
            for combo in itertools.combinations(others, size):
                raw_candidates.append([base_item_index] + list(combo))
    else:
        for size in range(2, min(5, n) + 1):
            for combo in itertools.combinations(indices, size):
                raw_candidates.append(list(combo))

    # ── KEY FIX: filter to only valid combinations ─────────────────────────
    candidate_sets = [
        idx_set for idx_set in raw_candidates
        if _is_valid_combination(idx_set, items)
    ]

    if not candidate_sets:
        logger.warning(
            "no_valid_combinations_after_filtering",
            n=n,
            base_item_index=base_item_index,
            raw_count=len(raw_candidates),
        )
        return []

    logger.info(
        "combination_candidates",
        raw=len(raw_candidates),
        valid=len(candidate_sets),
    )

    # Score all valid candidates
    scored: List[tuple[float, List[int], Dict[str, Any]]] = []

    for idx_set in candidate_sets:
        best_palette, avg_de = palette_service.find_best_palette_for_combination(
            all_colors, idx_set, anchor_palette=anchor_palette
        )
        base_score = palette_service.delta_e_to_harmony_score(avg_de)
        bonus = _subtype_bonus(idx_set, items) + _season_bonus(idx_set, items)
        final_score = min(100, base_score + bonus)
        scored.append((final_score, idx_set, best_palette))

    scored.sort(key=lambda x: -x[0])
    top = scored[:top_k]

    mode = "anchored" if base_item_index is not None else "free"

    results: List[OutfitCombination] = []
    for rank, (score, idx_set, palette) in enumerate(top, start=1):
        item_names = [items[i].get("clothing_type", f"Item {i}") for i in idx_set]
        anchor_idx = base_item_index if base_item_index in idx_set else None

        reasoning = _build_reasoning(
            item_names=item_names,
            palette=palette,
            anchor_name=anchor_name,
            mode=mode,
            harmony_score=int(score),
        )

        results.append(
            OutfitCombination(
                rank=rank,
                item_indices=idx_set,
                item_names=item_names,
                anchor_index=anchor_idx,
                harmony_score=int(score),
                matched_palette=palette_service.palette_to_response(palette),
                reasoning=reasoning,
            )
        )

    logger.info(
        "outfit_combinations_generated",
        mode=mode,
        count=len(results),
        top_score=results[0].harmony_score if results else None,
    )
    return results