from __future__ import annotations

import itertools
from typing import Any, Dict, List, Optional

import structlog

from models.response_models import OutfitCombination, MatchedPalette
from services import palette_service

logger = structlog.get_logger(__name__)

# Subtypes that belong to different clothing categories for the diversity bonus
_TOPS = {"tops", "knitwear", "shirts", "outerwear", "jackets", "coats"}
_BOTTOMS = {"trousers", "jeans", "shorts", "skirts"}
_FOOTWEAR = {"footwear", "shoes", "boots", "sneakers"}
_ACCESSORIES = {"accessories", "belts", "scarves", "hats"}


def _subtype_bonus(subtypes: List[str]) -> int:
    """Return +10 if combination spans top + bottom + shoes."""
    lower = {s.lower() for s in subtypes}
    has_top = bool(lower & _TOPS)
    has_bottom = bool(lower & _BOTTOMS)
    has_shoes = bool(lower & _FOOTWEAR)
    if has_top and has_bottom and has_shoes:
        return 10
    if (has_top and has_bottom) or (has_top and has_shoes) or (has_bottom and has_shoes):
        return 5
    return 0


def _season_bonus(season_lists: List[List[str]]) -> int:
    """Return +5 if all items share at least one season."""
    if not season_lists:
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
    """Generate a natural language explanation for the outfit combination."""
    palette_name = palette["palette_name"]
    palette_id = palette["palette_id"]
    combination_type = palette["combination_type"]
    mood_tags = ", ".join(palette.get("mood_tags", []))

    items_str = ", ".join(f"the {n}" for n in item_names)

    if mode == "anchored" and anchor_name:
        return (
            f"The {anchor_name} anchors this look within Wada's Palette {palette_id} — "
            f"\"{palette_name}\" — a {combination_type} grouping with a {mood_tags} character. "
            f"Pairing it with {', '.join(f'the {n}' for n in item_names if n != anchor_name)} "
            f"reinforces the palette's color story, yielding a harmony score of {harmony_score}/100."
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

    FREE MODE  (base_item_index is None): all combinations of 2–4 items.
    ANCHORED MODE (base_item_index is int): base item always included + 1–3 others.
    """
    n = len(items)
    all_colors: List[List[str]] = [item.get("dominant_colors", []) for item in items]
    all_subtypes: List[str] = [item.get("clothing_subtype", "") for item in items]
    all_seasons: List[List[str]] = [item.get("season_suitability", []) for item in items]

    # Determine the anchor palette (anchored mode only)
    anchor_palette: Optional[Dict[str, Any]] = None
    anchor_name: Optional[str] = None
    if base_item_index is not None and 0 <= base_item_index < n:
        anchor_colors = all_colors[base_item_index]
        if anchor_colors:
            best = palette_service.find_best_palettes_for_colors(anchor_colors, top_n=1)
            anchor_palette = best[0] if best else None
        anchor_name = items[base_item_index].get("clothing_type", f"Item {base_item_index}")

    # Build candidate index sets
    candidate_sets: List[List[int]] = []
    indices = list(range(n))

    if base_item_index is not None:
        others = [i for i in indices if i != base_item_index]
        for size in range(1, min(4, len(others)) + 1):
            for combo in itertools.combinations(others, size):
                candidate_sets.append([base_item_index] + list(combo))
    else:
        for size in range(2, min(5, n) + 1):
            for combo in itertools.combinations(indices, size):
                candidate_sets.append(list(combo))

    if not candidate_sets:
        logger.warning("no_candidate_combinations", n=n, base_item_index=base_item_index)
        return []

    # Score all candidates
    scored: List[tuple[float, List[int], Dict[str, Any]]] = []

    for idx_set in candidate_sets:
        best_palette, avg_de = palette_service.find_best_palette_for_combination(
            all_colors, idx_set, anchor_palette=anchor_palette
        )
        base_score = palette_service.delta_e_to_harmony_score(avg_de)

        subtypes_in_combo = [all_subtypes[i] for i in idx_set]
        seasons_in_combo = [all_seasons[i] for i in idx_set]

        bonus = _subtype_bonus(subtypes_in_combo) + _season_bonus(seasons_in_combo)
        final_score = min(100, base_score + bonus)

        scored.append((final_score, idx_set, best_palette))

    # Sort descending by score
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