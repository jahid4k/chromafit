// ─────────────────────────────────────────────
// ChromaFit — Mock API Seed Data
// lib/mock-data.ts
//
// Realistic AnalysisResponse fixtures.
// Two scenarios:
//   MOCK_ANCHORED — user anchored item #1 (the chinos)
//   MOCK_FREE     — free recommendation mode
//
// Cloudinary URLs point to real Unsplash photos
// that look like wardrobe items — no backend needed.
// ─────────────────────────────────────────────

import { AnalysisResponse } from "./types";

// ── Shared items (same wardrobe in both scenarios) ──

const SHARED_ITEMS = [
  {
    image_index: 0,
    filename: "navy-sweater.jpg",
    cloudinary_url:
      "https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=400&q=80",
    clothing_type: "crew-neck sweater",
    clothing_subtype: "knitwear",
    dominant_colors: ["#2C3E50", "#34495E", "#4A6278"],
    color_names: ["Charcoal Navy", "Slate Blue", "Steel Teal"],
    texture_notes: "ribbed knit, mid-weight",
    season_suitability: ["autumn", "winter"] as (
      | "spring"
      | "summer"
      | "autumn"
      | "winter"
    )[],
    anchor: false,
  },
  {
    image_index: 1,
    filename: "sand-chinos.jpg",
    cloudinary_url:
      "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=400&q=80",
    clothing_type: "slim-fit chinos",
    clothing_subtype: "trousers",
    dominant_colors: ["#C4A882", "#B8976A"],
    color_names: ["Sand Beige", "Warm Tan"],
    texture_notes: "matte cotton twill",
    season_suitability: ["spring", "summer", "autumn"] as (
      | "spring"
      | "summer"
      | "autumn"
      | "winter"
    )[],
    anchor: false,
  },
  {
    image_index: 2,
    filename: "white-oxford.jpg",
    cloudinary_url:
      "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=400&q=80",
    clothing_type: "oxford shirt",
    clothing_subtype: "tops",
    dominant_colors: ["#F5F0EB", "#E8E0D5"],
    color_names: ["Warm White", "Linen Cream"],
    texture_notes: "crisp cotton poplin",
    season_suitability: ["spring", "summer", "autumn", "winter"] as (
      | "spring"
      | "summer"
      | "autumn"
      | "winter"
    )[],
    anchor: false,
  },
  {
    image_index: 3,
    filename: "tan-boots.jpg",
    cloudinary_url:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80",
    clothing_type: "leather chelsea boots",
    clothing_subtype: "footwear",
    dominant_colors: ["#8B6914", "#A0793D"],
    color_names: ["Cognac Brown", "Honey Leather"],
    texture_notes: "smooth full-grain leather",
    season_suitability: ["autumn", "winter", "spring"] as (
      | "spring"
      | "summer"
      | "autumn"
      | "winter"
    )[],
    anchor: false,
  },
  {
    image_index: 4,
    filename: "grey-blazer.jpg",
    cloudinary_url:
      "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=400&q=80",
    clothing_type: "slim blazer",
    clothing_subtype: "outerwear",
    dominant_colors: ["#808080", "#696969", "#5A5A5A"],
    color_names: ["Mid Grey", "Charcoal", "Graphite"],
    texture_notes: "fine wool herringbone",
    season_suitability: ["autumn", "winter", "spring"] as (
      | "spring"
      | "summer"
      | "autumn"
      | "winter"
    )[],
    anchor: false,
  },
  {
    image_index: 5,
    filename: "black-jeans.jpg",
    cloudinary_url:
      "https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&q=80",
    clothing_type: "slim-fit jeans",
    clothing_subtype: "trousers",
    dominant_colors: ["#1A1A2E", "#16213E"],
    color_names: ["Jet Black", "Midnight Blue"],
    texture_notes: "stretch denim",
    season_suitability: ["spring", "summer", "autumn", "winter"] as (
      | "spring"
      | "summer"
      | "autumn"
      | "winter"
    )[],
    anchor: false,
  },
];

// ── Anchored scenario (item 1 = chinos as anchor) ──

export const MOCK_ANCHORED: AnalysisResponse = {
  session_id: "mock-session-anchored-001",
  mode: "anchored",
  base_item_index: 1,
  processing_time_ms: 4870,
  items: SHARED_ITEMS.map((item) => ({
    ...item,
    anchor: item.image_index === 1,
  })),
  outfit_combinations: [
    {
      rank: 1,
      item_indices: [0, 1, 3],
      item_names: [
        "crew-neck sweater",
        "slim-fit chinos",
        "leather chelsea boots",
      ],
      anchor_index: 1,
      harmony_score: 91,
      matched_palette: {
        palette_id: 142,
        palette_name: "Indigo Serenity",
        combination_type: "analogous",
        mood_tags: ["cool", "calm", "sophisticated"],
        colors: [
          { hex: "#2C3E50", name: "Charcoal Navy" },
          { hex: "#C4A882", name: "Sand Beige" },
          { hex: "#8B6914", name: "Cognac Brown" },
          { hex: "#F5F0EB", name: "Warm White" },
        ],
      },
      reasoning:
        "The sand beige chinos (anchor) ground this combination in Wada's Palette 142 — an analogous warm-to-cool grouping that bridges earth and navy. The charcoal navy sweater pulls from the cool end of the palette without competing with the chinos, while the cognac chelsea boots complete the triad by echoing the warm undertone of the beige. This is a textbook example of tonal analogous dressing: three distinct values, one coherent story.",
    },
    {
      rank: 2,
      item_indices: [1, 2, 3],
      item_names: ["slim-fit chinos", "oxford shirt", "leather chelsea boots"],
      anchor_index: 1,
      harmony_score: 85,
      matched_palette: {
        palette_id: 78,
        palette_name: "Autumn Harvest",
        combination_type: "monochromatic",
        mood_tags: ["warm", "earthy", "autumnal", "natural"],
        colors: [
          { hex: "#C4A882", name: "Sand Beige" },
          { hex: "#F5F0EB", name: "Warm White" },
          { hex: "#8B6914", name: "Cognac Brown" },
        ],
      },
      reasoning:
        "A warm monochromatic trio anchored in Palette 78. The linen-cream oxford sits between the sand beige chinos and cognac boots on the value scale, creating a seamless gradient from light to dark. Wada identifies this near-monochromatic warm sequence as particularly cohesive — the eye reads it as a single unified temperature rather than three separate garments.",
    },
    {
      rank: 3,
      item_indices: [1, 2, 4],
      item_names: ["slim-fit chinos", "oxford shirt", "slim blazer"],
      anchor_index: 1,
      harmony_score: 79,
      matched_palette: {
        palette_id: 203,
        palette_name: "Quiet Authority",
        combination_type: "split-complementary",
        mood_tags: ["cool", "refined", "muted", "professional"],
        colors: [
          { hex: "#C4A882", name: "Sand Beige" },
          { hex: "#808080", name: "Mid Grey" },
          { hex: "#F5F0EB", name: "Warm White" },
        ],
      },
      reasoning:
        "Sand beige and mid grey sit in a near-complementary relationship when viewed through the warm-cool axis Wada uses in Palette 203. The white oxford acts as a neutral mediator, preventing the warm beige and cool grey from clashing. This combination reads as polished and understated — the blazer elevates the chinos without overwhelming the palette's inherent quietness.",
    },
    {
      rank: 4,
      item_indices: [0, 1, 4],
      item_names: ["crew-neck sweater", "slim-fit chinos", "slim blazer"],
      anchor_index: 1,
      harmony_score: 74,
      matched_palette: {
        palette_id: 167,
        palette_name: "Urban Dusk",
        combination_type: "triadic",
        mood_tags: ["cool", "bold", "urban"],
        colors: [
          { hex: "#2C3E50", name: "Charcoal Navy" },
          { hex: "#808080", name: "Mid Grey" },
          { hex: "#C4A882", name: "Sand Beige" },
        ],
      },
      reasoning:
        "Three distinct values from the cool-neutral range of Palette 167. Navy, grey, and beige form a loose triadic relationship on Wada's cool axis. The risk here is layering navy and grey together — they compete for the same tonal space. The sand chinos resolve this by anchoring the look in warmth. A strong combination for urban settings, though the harmony score reflects the navy-grey tension.",
    },
    {
      rank: 5,
      item_indices: [1, 5, 2],
      item_names: ["slim-fit chinos", "slim-fit jeans", "oxford shirt"],
      anchor_index: 1,
      harmony_score: 61,
      matched_palette: {
        palette_id: 31,
        palette_name: "Coastal Contrast",
        combination_type: "complementary",
        mood_tags: ["cool", "casual", "coastal"],
        colors: [
          { hex: "#C4A882", name: "Sand Beige" },
          { hex: "#1A1A2E", name: "Jet Black" },
          { hex: "#F5F0EB", name: "Warm White" },
        ],
      },
      reasoning:
        "Pairing two bottom pieces is rarely recommended in color theory — it flattens the silhouette and creates tonal competition rather than harmony. The sand-and-jet contrast in Palette 31 is strong in isolation, but combining both trouser types in one look dilutes the impact. Scored lower due to subtype overlap. Consider this combination only when one piece is used as a layering element.",
    },
  ],
};

// ── Free mode scenario ──

export const MOCK_FREE: AnalysisResponse = {
  session_id: "mock-session-free-002",
  mode: "free",
  base_item_index: null,
  processing_time_ms: 5340,
  items: SHARED_ITEMS.map((item) => ({ ...item, anchor: false })),
  outfit_combinations: [
    {
      rank: 1,
      item_indices: [0, 1, 3],
      item_names: [
        "crew-neck sweater",
        "slim-fit chinos",
        "leather chelsea boots",
      ],
      anchor_index: null,
      harmony_score: 91,
      matched_palette: {
        palette_id: 142,
        palette_name: "Indigo Serenity",
        combination_type: "analogous",
        mood_tags: ["cool", "calm", "sophisticated"],
        colors: [
          { hex: "#2C3E50", name: "Charcoal Navy" },
          { hex: "#C4A882", name: "Sand Beige" },
          { hex: "#8B6914", name: "Cognac Brown" },
          { hex: "#F5F0EB", name: "Warm White" },
        ],
      },
      reasoning:
        "ChromaFit's highest-scoring free combination. The charcoal navy sweater, sand beige chinos, and cognac chelsea boots map precisely to Wada's Palette 142 — an analogous warm-to-cool grouping that Wada describes as 'effortlessly coherent.' Each item occupies a distinct position on the value scale: dark, mid, light-warm. The three-way color story requires no conscious effort from the wearer — it simply works.",
    },
    {
      rank: 2,
      item_indices: [2, 5, 4],
      item_names: ["oxford shirt", "slim-fit jeans", "slim blazer"],
      anchor_index: null,
      harmony_score: 87,
      matched_palette: {
        palette_id: 89,
        palette_name: "Silver Morning",
        combination_type: "monochromatic",
        mood_tags: ["cool", "muted", "refined", "minimal"],
        colors: [
          { hex: "#F5F0EB", name: "Warm White" },
          { hex: "#808080", name: "Mid Grey" },
          { hex: "#1A1A2E", name: "Jet Black" },
        ],
      },
      reasoning:
        "A cool-spectrum monochromatic combination that Wada features in Palette 89 as a study in value contrast. White shirt, grey blazer, black jeans — the classic three-value stack. What prevents this from being generic is the warm undertone of the oxford (linen cream rather than optical white) against the cool graphite of the blazer. That slight temperature tension is exactly what Wada advocates: harmony with just enough friction to hold visual interest.",
    },
    {
      rank: 3,
      item_indices: [0, 5, 3],
      item_names: [
        "crew-neck sweater",
        "slim-fit jeans",
        "leather chelsea boots",
      ],
      anchor_index: null,
      harmony_score: 82,
      matched_palette: {
        palette_id: 214,
        palette_name: "Midnight Ember",
        combination_type: "split-complementary",
        mood_tags: ["bold", "cool", "dramatic", "warm"],
        colors: [
          { hex: "#2C3E50", name: "Charcoal Navy" },
          { hex: "#1A1A2E", name: "Jet Black" },
          { hex: "#8B6914", name: "Cognac Brown" },
        ],
      },
      reasoning:
        "A deep-value combination with a warm accent. Navy and black sit in the same tonal family — Wada uses this dark-on-dark technique in Palette 214 to create depth rather than contrast. The cognac boots are the split-complementary accent: a warm, mid-value element that prevents the combination from reading as all-dark. This outfit rewards close inspection — the tonal complexity only becomes apparent in good light.",
    },
    {
      rank: 4,
      item_indices: [2, 1, 4],
      item_names: ["oxford shirt", "slim-fit chinos", "slim blazer"],
      anchor_index: null,
      harmony_score: 76,
      matched_palette: {
        palette_id: 57,
        palette_name: "Quiet Afternoon",
        combination_type: "neutral",
        mood_tags: ["warm", "muted", "natural", "delicate"],
        colors: [
          { hex: "#F5F0EB", name: "Warm White" },
          { hex: "#C4A882", name: "Sand Beige" },
          { hex: "#808080", name: "Mid Grey" },
        ],
      },
      reasoning:
        "A warm-neutral trio from Palette 57 — Wada's 'quiet afternoon' grouping that prioritizes restfulness over impact. White, beige, and grey occupy the mid-to-high value range without dark anchoring, which is why the harmony score is good but not exceptional. Adding the cognac boots would push this into the top-2 territory; as-is, the lack of a dark value makes the combination feel light and summery.",
    },
    {
      rank: 5,
      item_indices: [4, 5, 3],
      item_names: ["slim blazer", "slim-fit jeans", "leather chelsea boots"],
      anchor_index: null,
      harmony_score: 69,
      matched_palette: {
        palette_id: 173,
        palette_name: "Iron and Earth",
        combination_type: "complementary",
        mood_tags: ["cool", "bold", "urban", "earthy"],
        colors: [
          { hex: "#808080", name: "Mid Grey" },
          { hex: "#1A1A2E", name: "Jet Black" },
          { hex: "#8B6914", name: "Cognac Brown" },
        ],
      },
      reasoning:
        "Cool-dark base with a warm-brown accent — a complementary pairing that Wada studies in Palette 173. Grey blazer over black jeans is a common combination, but the cognac boots introduce the warm note that justifies the pairing in color theory terms. The lower score reflects the absence of a light value in the combination — without a white or cream element, the look can flatten in photographs or artificial light.",
    },
  ],
};
