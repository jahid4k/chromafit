"use client";

// ─────────────────────────────────────────────
// OutfitRankingList
// Renders outfit combinations ranked #2–#5.
// Each card is collapsible. The hero (#1) is
// rendered separately on the results page.
// ─────────────────────────────────────────────

import { OutfitCombination, WardrobeItem } from "@/lib/types";
import OutfitCombinationCard from "./OutfitCombinationCard";

interface Props {
  combinations: OutfitCombination[]; // should be combinations[1..] (skip rank 1)
  items: WardrobeItem[];
}

export default function OutfitRankingList({ combinations, items }: Props) {
  if (combinations.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-xs uppercase tracking-widest text-stone-400 font-medium px-1">
        More Combinations
      </h3>
      {combinations.map((combo) => (
        <OutfitCombinationCard
          key={combo.rank}
          combination={combo}
          items={items}
          isHero={false}
        />
      ))}
    </div>
  );
}
