"use client";

// ─────────────────────────────────────────────
// OutfitCombinationCard
// Displays one ranked outfit combination.
// Shows item names, combined swatches,
// matched palette, and harmony score.
// Expandable to show full reasoning.
// ─────────────────────────────────────────────

import { useState } from "react";
import { OutfitCombination, WardrobeItem } from "@/lib/types";
import ColorSwatchBar from "./ColorSwatchBar";
import PaletteMatchCard from "./PaletteMatchCard";
import ReasoningPanel from "./ReasoningPanel";

interface Props {
  combination: OutfitCombination;
  items: WardrobeItem[];
  isHero?: boolean;
}

export default function OutfitCombinationCard({
  combination,
  items,
  isHero = false,
}: Props) {
  const [expanded, setExpanded] = useState(isHero);

  // Gather all dominant colors from included items
  const combinedColors: string[] = [];
  const combinedColorNames: string[] = [];
  combination.item_indices.forEach((idx) => {
    const item = items[idx];
    if (item) {
      item.dominant_colors.forEach((hex, i) => {
        if (!combinedColors.includes(hex)) {
          combinedColors.push(hex);
          combinedColorNames.push(item.color_names[i] ?? hex);
        }
      });
    }
  });

  return (
    <div
      className={`border rounded-2xl overflow-hidden bg-white transition-shadow ${
        isHero
          ? "border-stone-300 shadow-md"
          : "border-stone-200 hover:border-stone-300 hover:shadow-sm"
      }`}
    >
      {/* Header row */}
      <div
        className={`flex items-center gap-4 px-5 py-4 ${!isHero ? "cursor-pointer" : ""}`}
        onClick={() => !isHero && setExpanded((v) => !v)}
      >
        {/* Rank */}
        <div
          className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-display font-bold text-lg ${
            isHero ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-500"
          }`}
        >
          {combination.rank}
        </div>

        {/* Item names */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-x-2 gap-y-0.5">
            {combination.item_names.map((name, i) => (
              <span key={i} className="flex items-center gap-1">
                <span className="text-sm font-medium text-stone-700 capitalize">
                  {name}
                </span>
                {combination.anchor_index === combination.item_indices[i] && (
                  <span className="text-xs">⚓</span>
                )}
                {i < combination.item_names.length - 1 && (
                  <span className="text-stone-300 text-sm">·</span>
                )}
              </span>
            ))}
          </div>
          <div className="mt-1.5">
            <ColorSwatchBar
              colors={combinedColors}
              colorNames={combinedColorNames}
              size="sm"
            />
          </div>
        </div>

        {/* Harmony score */}
        <div className="flex-shrink-0 text-right">
          <div
            className={`font-display font-bold ${isHero ? "text-4xl text-stone-900" : "text-2xl text-stone-700"}`}
          >
            {combination.harmony_score}
          </div>
          <div className="text-[10px] uppercase tracking-widest text-stone-400">
            Harmony
          </div>
        </div>

        {/* Expand toggle (non-hero) */}
        {!isHero && (
          <div className="flex-shrink-0 text-stone-400 text-xs">
            {expanded ? "▲" : "▼"}
          </div>
        )}
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-stone-100 pt-4 flex flex-col gap-4">
          {/* Palette match */}
          <PaletteMatchCard
            palette={combination.matched_palette}
            compact={!isHero}
          />

          {/* Item thumbnails (hero only) */}
          {isHero && (
            <div className="flex gap-3 overflow-x-auto pb-1">
              {combination.item_indices.map((idx) => {
                const item = items[idx];
                if (!item) return null;
                return (
                  <div key={idx} className="flex-shrink-0 text-center">
                    <div className="w-24 h-24 rounded-xl overflow-hidden border border-stone-200 bg-stone-50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.cloudinary_url}
                        alt={item.clothing_type}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-[11px] text-stone-500 mt-1 capitalize max-w-[96px] leading-tight">
                      {item.clothing_type}
                    </p>
                    {item.anchor && (
                      <p className="text-[10px] text-stone-400">⚓ anchor</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Reasoning */}
          <ReasoningPanel
            reasoning={combination.reasoning}
            harmonyScore={combination.harmony_score}
          />
        </div>
      )}
    </div>
  );
}
