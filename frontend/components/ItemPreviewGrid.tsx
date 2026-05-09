"use client";

// ─────────────────────────────────────────────
// ItemPreviewGrid
// Wardrobe grid on the results page.
// Each card: thumbnail, clothing type label,
// color swatches, season tags.
// Anchor item gets a distinct ring + ⚓ badge.
// ─────────────────────────────────────────────

import { WardrobeItem } from "../lib/types";
import ColorSwatchBar from "./ColorSwatchBar";

interface Props {
  items: WardrobeItem[];
}

const seasonColors: Record<string, string> = {
  spring: "text-emerald-600 bg-emerald-50",
  summer: "text-amber-600 bg-amber-50",
  autumn: "text-orange-600 bg-orange-50",
  winter: "text-sky-600 bg-sky-50",
};

export default function ItemPreviewGrid({ items }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {items.map((item) => (
        <div
          key={item.image_index}
          className={`relative rounded-xl overflow-hidden border bg-white transition-shadow hover:shadow-sm ${
            item.anchor
              ? "border-stone-800 ring-2 ring-stone-900 ring-offset-2"
              : "border-stone-200"
          }`}
        >
          {/* Anchor badge */}
          {item.anchor && (
            <div className="absolute top-2 left-2 z-10 bg-stone-900 text-white text-[10px] rounded-full px-2 py-0.5 flex items-center gap-1 shadow">
              <span>⚓</span>
              <span className="uppercase tracking-wider font-medium">
                Anchor
              </span>
            </div>
          )}

          {/* Image */}
          <div className="aspect-square bg-stone-50 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.cloudinary_url}
              alt={item.clothing_type}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Info */}
          <div className="px-3 py-3">
            <p className="text-sm font-medium text-stone-800 capitalize leading-tight">
              {item.clothing_type}
            </p>
            <p className="text-[11px] text-stone-400 capitalize mt-0.5">
              {item.clothing_subtype}
            </p>

            {/* Swatches */}
            <div className="mt-2">
              <ColorSwatchBar
                colors={item.dominant_colors}
                colorNames={item.color_names}
                size="sm"
              />
            </div>

            {/* Season tags */}
            <div className="flex flex-wrap gap-1 mt-2">
              {item.season_suitability.map((season) => (
                <span
                  key={season}
                  className={`text-[10px] rounded-full px-1.5 py-0.5 capitalize font-medium ${
                    seasonColors[season] ?? "text-stone-500 bg-stone-100"
                  }`}
                >
                  {season}
                </span>
              ))}
            </div>

            {/* Texture note */}
            {item.texture_notes && (
              <p className="text-[10px] text-stone-400 italic mt-2 leading-tight">
                {item.texture_notes}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
