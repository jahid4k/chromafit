from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel, Field


class PaletteColor(BaseModel):
    hex: str
    name: str


class MatchedPalette(BaseModel):
    palette_id: int
    palette_name: str
    combination_type: str
    mood_tags: List[str]
    colors: List[PaletteColor]


class WardrobeItem(BaseModel):
    image_index: int
    filename: str
    cloudinary_url: str
    clothing_type: str
    clothing_subtype: str
    dominant_colors: List[str]
    color_names: List[str]
    texture_notes: str
    season_suitability: List[str]
    anchor: bool = False


class OutfitCombination(BaseModel):
    rank: int
    item_indices: List[int]
    item_names: List[str]
    anchor_index: Optional[int] = None
    harmony_score: int = Field(ge=0, le=100)
    matched_palette: MatchedPalette
    reasoning: str


class AnalyzeResponse(BaseModel):
    session_id: str
    mode: str  # "free" | "anchored"
    base_item_index: Optional[int] = None
    items: List[WardrobeItem]
    outfit_combinations: List[OutfitCombination]
    processing_time_ms: int


class SessionResponse(AnalyzeResponse):
    """Identical schema — alias for GET /sessions/{id}."""
    pass