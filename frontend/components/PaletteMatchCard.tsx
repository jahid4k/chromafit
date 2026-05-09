"use client";

// ─────────────────────────────────────────────
// PaletteMatchCard
// Displays a matched Sanzo Wada palette with
// its name, ID, type, mood tags, and color strip.
// ─────────────────────────────────────────────

import { MatchedPalette } from "@/lib/types";

interface Props {
  palette: MatchedPalette;
  compact?: boolean;
}

const typeLabels: Record<string, string> = {
  analogous: "Analogous",
  complementary: "Complementary",
  triadic: "Triadic",
  "split-complementary": "Split-Complementary",
  monochromatic: "Monochromatic",
  neutral: "Neutral",
};

export default function PaletteMatchCard({ palette, compact = false }: Props) {
  return (
    <div className="border border-stone-200 rounded-xl overflow-hidden bg-white">
      {/* Color strip */}
      <div className="flex h-10">
        {palette.colors.map((color) => (
          <div
            key={color.hex}
            className="flex-1 relative group"
            style={{ backgroundColor: color.hex }}
          >
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-0.5 bg-stone-900 text-white text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
              {color.name}
            </div>
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-stone-400 font-medium">
              Sanzo Wada · Palette {palette.palette_id}
            </p>
            <p className="font-display text-base font-semibold text-stone-800 mt-0.5 leading-tight">
              {palette.palette_name}
            </p>
          </div>
          <span className="text-[10px] border border-stone-200 rounded-full px-2 py-0.5 text-stone-500 whitespace-nowrap mt-0.5">
            {typeLabels[palette.combination_type] ?? palette.combination_type}
          </span>
        </div>

        {!compact && (
          <>
            <div className="flex flex-wrap gap-1 mt-2">
              {palette.mood_tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] bg-stone-100 text-stone-500 rounded-full px-2 py-0.5 capitalize"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Individual color hex codes */}
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
              {palette.colors.map((color) => (
                <div key={color.hex} className="flex items-center gap-1.5">
                  <div
                    className="w-3 h-3 rounded-full border border-black/10 flex-shrink-0"
                    style={{ backgroundColor: color.hex }}
                  />
                  <span className="text-[10px] text-stone-500">
                    <span className="font-mono">{color.hex}</span>{" "}
                    <span className="text-stone-400">·</span> {color.name}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
