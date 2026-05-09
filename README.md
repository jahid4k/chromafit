# ChromaFit

> **Your wardrobe. Decoded by color theory.**

ChromaFit uses **Qwen2.5-VL** on **AMD Instinct MI300X** to analyze your wardrobe and recommend outfits grounded in Sanzo Wada's century-old color harmony principles.

---

## What Is ChromaFit?

Most people own great clothes but struggle to combine them well. ChromaFit solves this with AI-powered color theory — not style opinions, not generic rules, but mathematically grounded harmony derived from **Sanzo Wada's _A Dictionary of Color Combinations_**, a masterwork of Japanese color theory published in 1933.

Upload photos of 3–10 wardrobe items. ChromaFit's vision model detects each item's type and extracts its dominant color palette in a single inference pass. The palette engine then matches those colors against Wada's curated combinations using perceptually accurate Delta-E (CIE2000) distance in LAB color space — the same metric used by professional colorists and print studios. The result: ranked outfit recommendations with named palette references, harmony scores, and a natural-language explanation of _why_ each combination works.

---

## The Core Loop

```
Upload 3–10 wardrobe item photos
        ↓
Qwen2.5-VL detects clothing type + extracts dominant hex colors (single inference pass)
        ↓
Optional: select one item as an anchor — or let ChromaFit choose freely
        ↓
Palette engine matches colors against Sanzo Wada dataset via Delta-E (CIE2000) in LAB space
        ↓
Outfit combinations ranked by harmony score, with named palette references and reasoning
```

**Two recommendation modes — one seamless experience:**

- **Free Mode** — ChromaFit evaluates all uploaded items and surfaces the top 5 combinations across the full wardrobe, ranked by color harmony score.
- **Anchored Mode** — You designate one item as the anchor (⚓). Every recommended combination is built around it; other items are scored by how well they harmonize with the anchor item's matched Wada palette.

Both modes share the same backend endpoint. The `base_item_index` field in the request toggles the mode.

---

## Why AMD MI300X?

ChromaFit sends up to **10 high-resolution images in a single vLLM call**, requiring a 16K-token context window and high VRAM to process the full wardrobe simultaneously. This is a deliberate architectural choice — it lets Qwen2.5-VL reason about inter-item relationships in one pass rather than calling the model once per image.

| Requirement                       | Why MI300X                                                                                                                       |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 16K context window with 10 images | MI300X has 192GB HBM3 — handles this on a single GPU. An H100 (80GB) would require multi-GPU coordination.                       |
| Concurrent demo sessions          | `max-num-seqs 8` allows 8 parallel analysis sessions without queue stalling.                                                     |
| Open inference stack              | ROCm runtime, no CUDA lock-in. Fully reproducible on any ROCm-compatible hardware.                                               |
| Future scalability                | Phase 2 adds Stable Diffusion XL + ControlNet for outfit preview images — MI300X runs both pipelines simultaneously on one node. |

---

## Tech Stack

| Layer            | Technology                                                                     |
| ---------------- | ------------------------------------------------------------------------------ |
| Frontend         | Next.js 14 (App Router) + Tailwind CSS                                         |
| Backend API      | Python FastAPI                                                                 |
| AI Model         | Qwen2.5-VL-7B-Instruct                                                         |
| Inference Server | vLLM (OpenAI-compatible endpoint)                                              |
| Infrastructure   | AMD Developer Cloud · AMD Instinct MI300X · ROCm                               |
| Database         | MongoDB (Motor async driver)                                                   |
| Image Storage    | Cloudinary                                                                     |
| Color Matching   | Sanzo Wada palette dataset + custom Python engine (colormath, Delta-E CIE2000) |

---

## Project Structure

```
chromafit/
├── frontend/
│   ├── app/
│   │   ├── page.tsx                        # Upload UI — wardrobe intake
│   │   ├── results/[sessionId]/
│   │   │   └── page.tsx                    # Results dashboard
│   │   └── layout.tsx
│   ├── components/
│   │   ├── WardrobeUploader.tsx            # Drag-and-drop multi-image upload
│   │   ├── BaseItemSelector.tsx            # Anchor item selector / free mode toggle
│   │   ├── ItemPreviewGrid.tsx             # Clothing thumbnails with detected labels
│   │   ├── ColorSwatchBar.tsx              # Hex color swatches per item
│   │   ├── PaletteMatchCard.tsx            # Matched Wada palette name + color strip
│   │   ├── OutfitCombinationCard.tsx       # Single outfit recommendation
│   │   ├── OutfitRankingList.tsx           # All combinations ranked
│   │   └── ReasoningPanel.tsx             # AI natural language explanation
│   └── lib/
│       └── api.ts                          # All backend fetch calls
│
├── backend/
│   ├── main.py                             # App entry, middleware, exception handlers
│   ├── routers/
│   │   ├── analysis.py                     # POST /analyze
│   │   └── sessions.py                     # GET /sessions/{id}
│   ├── services/
│   │   ├── vision_service.py               # vLLM call — clothing detection + color extraction
│   │   ├── palette_service.py              # Sanzo Wada matching engine
│   │   ├── outfit_service.py               # Combination generation + ranking
│   │   └── storage_service.py             # Cloudinary async upload
│   ├── models/
│   │   ├── request_models.py               # Pydantic input schemas
│   │   └── response_models.py             # Pydantic output schemas
│   ├── db/
│   │   └── mongo.py                        # Motor client + query helpers
│   ├── data/
│   │   └── sanzo_wada_palettes.json        # Wada color dataset
│   └── config.py                           # pydantic-settings — all env vars
│
├── vllm/
│   └── start_server.sh                     # vLLM launch script for AMD MI300X
│
├── docker-compose.yml
└── README.md
```

---

## Setup

### Prerequisites

- Docker + Docker Compose
- AMD MI300X node with ROCm installed (for vLLM inference)
- MongoDB Atlas account (free tier works)
- Cloudinary account (free tier works)

### 1. Clone the repository

```bash
git clone https://github.com/your-org/chromafit.git
cd chromafit
```

### 2. Configure environment variables

Copy the example env file and fill in your credentials:

```bash
cp .env.example .env
```

```env
# vLLM
VLLM_HOST=localhost
VLLM_PORT=8000
VLLM_MODEL=Qwen/Qwen2.5-VL-7B-Instruct

# MongoDB
MONGODB_URL=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<db>
MONGODB_DB_NAME=chromafit

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_FOLDER=chromafit

# App
APP_ENV=development
LOG_LEVEL=INFO
MAX_IMAGES_PER_REQUEST=10
MAX_IMAGE_SIZE_MB=5

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8001
```

### 3. Start the vLLM inference server (AMD MI300X)

```bash
bash vllm/start_server.sh
```

This launches Qwen2.5-VL-7B-Instruct on port 8000 via vLLM with ROCm:

```bash
python -m vllm.entrypoints.openai.api_server \
  --model Qwen/Qwen2.5-VL-7B-Instruct \
  --dtype float16 \
  --max-model-len 16384 \
  --gpu-memory-utilization 0.88 \
  --max-num-seqs 8 \
  --port 8000 \
  --host 0.0.0.0
```

**Parameter rationale:**

- `max-model-len 16384` — required to fit up to 10 wardrobe images in one request
- `gpu-memory-utilization 0.88` — safe ceiling for MI300X's 192GB HBM3 (default 0.85 is conservative here)
- `max-num-seqs 8` — supports concurrent demo sessions without queue stalling

### 4. Start the application

```bash
docker-compose up --build
```

- Backend API: `http://localhost:8001`
- Frontend: `http://localhost:3000`

---

## API Reference

### `POST /api/analyze`

Accepts wardrobe images and returns outfit recommendations.

**Request:** `multipart/form-data`

| Field             | Type    | Required   | Description                                       |
| ----------------- | ------- | ---------- | ------------------------------------------------- |
| `images[]`        | file    | Yes (3–10) | JPEG, PNG, or WEBP. Max 5MB each.                 |
| `base_item_index` | integer | No         | 0-based index of anchor item. Omit for free mode. |

**Response:**

```json
{
  "session_id": "uuid-string",
  "mode": "anchored",
  "base_item_index": 1,
  "items": [
    {
      "image_index": 0,
      "filename": "sweater.jpg",
      "cloudinary_url": "https://res.cloudinary.com/...",
      "clothing_type": "crew-neck sweater",
      "clothing_subtype": "knitwear",
      "dominant_colors": ["#2C3E50", "#34495E"],
      "color_names": ["Charcoal Navy", "Slate Blue"],
      "texture_notes": "ribbed knit",
      "season_suitability": ["autumn", "winter"],
      "anchor": false
    }
  ],
  "outfit_combinations": [
    {
      "rank": 1,
      "item_indices": [0, 1, 4],
      "item_names": [
        "crew-neck sweater",
        "slim-fit chinos",
        "leather chelsea boots"
      ],
      "anchor_index": 1,
      "harmony_score": 87,
      "matched_palette": {
        "palette_id": 142,
        "palette_name": "Indigo Serenity",
        "combination_type": "analogous",
        "mood_tags": ["cool", "calm", "sophisticated"],
        "colors": [{ "hex": "#2C3E50", "name": "Charcoal Navy" }]
      },
      "reasoning": "The sand beige chinos anchor the palette in Wada's Palette 142..."
    }
  ],
  "processing_time_ms": 5200
}
```

### `GET /api/sessions/{session_id}`

Returns a previously stored analysis session. Identical schema to the POST response.

---

## How the Color Matching Works

The palette engine is the intellectual core of ChromaFit. It runs entirely in memory — the Sanzo Wada dataset is loaded and validated at startup, cached as a module-level variable, and never re-read per request. Target latency: **under 100ms**. The bottleneck in any session is only the vLLM inference call.

**Matching algorithm:**

1. Each wardrobe item's dominant hex colors are converted to **LAB color space** using the `colormath` library.
2. For every Sanzo Wada palette, ChromaFit computes **Delta-E (CIE2000)** distance between the item colors and each palette color. The minimum Delta-E across all palette colors is the palette's match score for that item (lower = better match).
3. The top 3 palettes per item are retained.
4. For outfit combinations, ChromaFit prioritizes palettes that match colors from **multiple items simultaneously** — these cross-item matches are the "harmony matches" and rank highest.

Delta-E CIE2000 is used rather than RGB Euclidean distance because it is perceptually uniform — a difference of 1 unit corresponds to the smallest color difference a trained human eye can detect. Simple RGB distance produces incorrect rankings for colors that look similar but differ in lightness, which is a well-known failure mode when matching earth tones and neutrals.

---

## Harmony Scoring

Outfit combinations are scored 0–100:

| Component               | Value                                                                                  |
| ----------------------- | -------------------------------------------------------------------------------------- |
| Base score              | Inverse of average Delta-E to the best matching palette (lower Delta-E → higher score) |
| Subtype diversity bonus | +10 if the combination spans distinct subtypes (e.g., top + bottom + footwear)         |
| Season overlap bonus    | +5 if all items share at least one season                                              |

In **anchored mode**, the anchor item's best matching palette becomes the target palette. All other items in a combination are scored by how well they fit _into that same palette_, rather than finding their own best palette independently.

---

## Results Dashboard

The results page is designed as a judge-ready product demonstration:

- **Mode badge** — top right. _"⚓ Anchored to: slim-fit chinos"_ or _"✦ Free Recommendation"_.
- **Wardrobe Grid** — all uploaded items with thumbnails, clothing type labels, hex color swatches, and season tags. Anchor item shown with a ring and anchor icon.
- **Hero Outfit** — the #1 ranked combination displayed prominently: item thumbnails side by side, combined palette swatch bar, matched Wada palette name and ID, harmony score, and reasoning paragraph.
- **Ranked List** — the remaining 4 combinations in a scrollable list, expandable for full reasoning.
- **Palette Reference Panel** — the matched Wada palette rendered as a color strip with hex codes and color names, labeled _"Matched from Sanzo Wada's A Dictionary of Color Combinations"_.

---

## Roadmap

**Phase 1 — Hackathon prototype (current)**

- Multi-image wardrobe upload
- Qwen2.5-VL clothing detection + color extraction (single inference pass)
- Sanzo Wada palette matching via Delta-E CIE2000
- Free and anchored recommendation modes
- Session persistence via MongoDB

**Phase 2 — Virtual Try-On Preview**
Using Stable Diffusion XL with ControlNet (pose conditioning) served on AMD MI300X, ChromaFit will generate a photorealistic preview image of a user-specified figure wearing the recommended outfit combination. The MI300X's 192GB HBM3 memory makes it possible to run SD XL + ControlNet + Qwen2.5-VL simultaneously on a single GPU node — an infrastructure advantage that would require multi-node coordination on consumer-grade hardware.

**Phase 3 — Wardrobe persistence and seasonal rotation**

- User wardrobe stored permanently (no re-upload)
- Seasonal outfit rotation recommendations
- "What's missing?" gap analysis — items ChromaFit would recommend adding to complete a palette

---

## Built With

- [Qwen2.5-VL](https://huggingface.co/Qwen/Qwen2.5-VL-7B-Instruct) — multimodal vision-language model by Alibaba Cloud
- [vLLM](https://github.com/vllm-project/vllm) — production-grade LLM serving with OpenAI-compatible API
- [AMD Instinct MI300X](https://www.amd.com/en/products/accelerators/instinct/mi300/mi300x.html) — 192GB HBM3, ROCm runtime
- [Sanzo Wada's _A Dictionary of Color Combinations_](https://sanzo-wada.dmbk.io/) — a 1933 Japanese reference work on color harmony, digitized as a structured dataset
- [colormath](https://github.com/gtaylor/python-colormath) — LAB color space conversion and Delta-E computation

---

## Hackathon Context

Built for the **AMD Developer Hackathon** (lablab.ai, May 2026) — Vision & Multimodal AI Track.

> _Every person who owns clothes is a user. ChromaFit turns color theory from an art school concept into a daily utility._

---

## License

MIT
