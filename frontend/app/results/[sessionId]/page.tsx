"use client";

// ─────────────────────────────────────────────
// ChromaFit Results Page
// app/results/[sessionId]/page.tsx
//
// Sections:
//   1. Mode badge + processing metadata
//   2. Wardrobe grid (all items)
//   3. Hero outfit (#1 ranked)
//   4. Remaining outfit combinations
//   5. Palette reference panel
// ─────────────────────────────────────────────

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AnalysisResponse } from "@/lib/types";
import { getSession, ApiError } from "@/lib/api";
import ItemPreviewGrid from "@/components/ItemPreviewGrid";
import OutfitCombinationCard from "@/components/OutfitCombinationCard";
import OutfitRankingList from "@/components/OutfitRankingList";
import PaletteMatchCard from "@/components/PaletteMatchCard";

// ── Skeleton for unexpected load delay ───────

function ResultsSkeleton() {
  return (
    <div className="animate-pulse space-y-6 max-w-5xl mx-auto px-6 py-10">
      <div className="h-6 bg-stone-200 rounded w-48" />
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="aspect-square bg-stone-200 rounded-xl" />
        ))}
      </div>
      <div className="h-64 bg-stone-200 rounded-2xl" />
    </div>
  );
}

// ── Main ─────────────────────────────────────

export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId =
    typeof params.sessionId === "string"
      ? params.sessionId
      : (params.sessionId?.[0] ?? "");

  const [data, setData] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ FIXED — all setState calls inside an async inner function
  useEffect(() => {
    let cancelled = false;

    const loadSession = async () => {
      // Check cache first
      const cached = sessionStorage.getItem(sessionId);
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as AnalysisResponse;
          if (!cancelled) {
            setData(parsed);
            setLoading(false);
          }
          return;
        } catch {
          // cache corrupted — fall through to fetch
          sessionStorage.removeItem(sessionId);
        }
      }

      // Fetch from API
      try {
        const result = await getSession(sessionId);
        if (!cancelled) {
          setData(result);
          sessionStorage.setItem(sessionId, JSON.stringify(result));
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load session",
          );
          setLoading(false);
        }
      }
    };

    loadSession();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (loading) return <ResultsSkeleton />;

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-sm">
          <p className="font-display text-3xl text-stone-300 mb-4">Hmm.</p>
          <p className="text-stone-500 text-sm mb-6">
            {error ?? "Something went wrong."}
          </p>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-2.5 bg-stone-900 text-white text-sm rounded-xl hover:bg-stone-800 transition-colors"
          >
            Start over
          </button>
        </div>
      </div>
    );
  }

  const heroCombo = data.outfit_combinations[0] ?? null;
  const remainingCombos = data.outfit_combinations.slice(1);
  const anchorItem = data.items.find((item) => item.anchor);
  const processingSeconds = (data.processing_time_ms / 1000).toFixed(1);

  return (
    <div className="min-h-screen bg-stone-50">
      {/* ── Nav ────────────────────────────── */}
      <header className="border-b border-stone-200 bg-white/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => router.push("/")}
            className="font-display text-xl font-semibold text-stone-900 hover:text-stone-600 transition-colors"
          >
            ChromaFit
          </button>

          <div className="flex items-center gap-3">
            {/* Processing time */}
            <span className="text-[11px] text-stone-400 hidden sm:inline">
              Analyzed in {processingSeconds}s
            </span>

            {/* Mode badge */}
            {data.mode === "anchored" && anchorItem ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] bg-stone-900 text-white rounded-full px-3 py-1">
                <span>⚓</span>
                <span>Anchored to: {anchorItem.clothing_type}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[11px] bg-stone-100 text-stone-500 rounded-full px-3 py-1">
                <span>✦</span>
                <span>Free Recommendation</span>
              </span>
            )}

            <button
              onClick={() => router.push("/")}
              className="text-xs text-stone-400 hover:text-stone-600 transition-colors border border-stone-200 rounded-lg px-3 py-1.5"
            >
              New analysis
            </button>
          </div>
        </div>
      </header>

      {/* ── Main content ─────────────────── */}
      <main className="max-w-5xl mx-auto px-6 py-10 space-y-14">
        {/* Section 1: Page heading */}
        <div className="animate-fade-up">
          <h2 className="font-display text-4xl sm:text-5xl font-semibold text-stone-900 leading-tight">
            Your wardrobe,
            <br />
            <span className="text-stone-400 font-normal italic">
              harmonized.
            </span>
          </h2>
          <p className="mt-3 text-sm text-stone-400">
            {data.items.length} items analyzed ·{" "}
            {data.outfit_combinations.length} combinations ranked
          </p>
        </div>

        {/* Section 2: Wardrobe grid */}
        <section className="animate-fade-up-delay-1">
          <h3 className="text-xs uppercase tracking-widest text-stone-400 font-medium mb-4">
            Wardrobe Items
          </h3>
          <ItemPreviewGrid items={data.items} />
        </section>

        {/* Section 3: Hero outfit */}
        {heroCombo && (
          <section className="animate-fade-up-delay-2">
            <div className="flex items-center gap-3 mb-4">
              <h3 className="text-xs uppercase tracking-widest text-stone-400 font-medium">
                Top Outfit
              </h3>
              <div className="h-px flex-1 bg-stone-200" />
              <span className="text-[11px] text-stone-400">
                Harmony score: {heroCombo.harmony_score}/100
              </span>
            </div>
            <OutfitCombinationCard
              combination={heroCombo}
              items={data.items}
              isHero
            />
          </section>
        )}

        {/* Section 4: Remaining combinations */}
        {remainingCombos.length > 0 && (
          <section className="animate-fade-up-delay-3">
            <OutfitRankingList
              combinations={remainingCombos}
              items={data.items}
            />
          </section>
        )}

        {/* Section 5: Palette reference panel */}
        {heroCombo && (
          <section className="animate-fade-up-delay-3">
            <div className="border-t border-stone-200 pt-10">
              <h3 className="text-xs uppercase tracking-widest text-stone-400 font-medium mb-2">
                Palette Reference
              </h3>
              <p className="text-xs text-stone-400 mb-5 italic">
                Matched from Sanzo Wada&apos;s{" "}
                <em>A Dictionary of Color Combinations</em> (1933)
              </p>
              <div className="max-w-lg">
                <PaletteMatchCard
                  palette={heroCombo.matched_palette}
                  compact={false}
                />
              </div>
              <p className="text-[11px] text-stone-300 mt-4 leading-relaxed max-w-lg">
                Wada&apos;s work catalogues hundreds of color combinations drawn
                from Japanese art and nature. Each palette is a tested, proven
                harmony — not a generated suggestion. ChromaFit matches your
                wardrobe to these combinations using Delta-E CIE2000 distance in
                LAB color space.
              </p>
            </div>
          </section>
        )}

        {/* AMD / tech attribution */}
        <footer className="border-t border-stone-200 pt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs text-stone-400 font-medium">Powered by</p>
            <p className="text-xs text-stone-500 mt-0.5">
              Qwen2.5-VL-7B-Instruct · vLLM · AMD Instinct MI300X · ROCm
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-stone-300 uppercase tracking-widest">
              ChromaFit · AMD Developer Hackathon · lablab.ai
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
