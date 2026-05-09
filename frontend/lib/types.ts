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

// ── Sessions list ─────────────────────────────

export interface SessionSummary {
  session_id: string;
  created_at: string | null;
  mode: "free" | "anchored";
  image_count: number;
  thumbnail_url: string | null;
  thumbnail_type: string | null;
  anchor: boolean;
  top_harmony_score: number | null;
  top_palette_name: string | null;
  top_palette_colors: WadaColor[];
  top_item_names: string[];
}

export interface SessionsPagination {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface SessionsResponse {
  sessions: SessionSummary[];
  pagination: SessionsPagination;
}
