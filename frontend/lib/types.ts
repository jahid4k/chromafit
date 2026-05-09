// ─────────────────────────────────────────────
// ChromaFit — Shared TypeScript Types
// ─────────────────────────────────────────────

export interface WadaColor {
  hex: string;
  name: string;
}

export interface MatchedPalette {
  palette_id: number;
  palette_name: string;
  combination_type:
    | "analogous"
    | "complementary"
    | "triadic"
    | "split-complementary"
    | "monochromatic"
    | "neutral";
  mood_tags: string[];
  colors: WadaColor[];
}

export interface WardrobeItem {
  image_index: number;
  filename: string;
  cloudinary_url: string;
  clothing_type: string;
  clothing_subtype: string;
  dominant_colors: string[];
  color_names: string[];
  texture_notes: string;
  season_suitability: ("spring" | "summer" | "autumn" | "winter")[];
  anchor: boolean;
}

export interface OutfitCombination {
  rank: number;
  item_indices: number[];
  item_names: string[];
  anchor_index: number | null;
  harmony_score: number;
  matched_palette: MatchedPalette;
  reasoning: string;
}

export interface AnalysisResponse {
  session_id: string;
  mode: "free" | "anchored";
  base_item_index: number | null;
  items: WardrobeItem[];
  outfit_combinations: OutfitCombination[];
  processing_time_ms: number;
}

export interface AnalysisRequest {
  images: File[];
  base_item_index?: number;
}
