"use client";

// ─────────────────────────────────────────────
// ChromaFit Palette Library
// app/palettes/page.tsx
//
// Displays all Sanzo Wada palettes fetched from
// GET /api/palettes with filtering by combination
// type and mood tags.
// ─────────────────────────────────────────────

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { MatchedPalette } from "@/lib/types";
import { getPalettes, ApiError } from "@/lib/api";
import PaletteMatchCard from "@/components/PaletteMatchCard";

// ── Constants ────────────────────────────────

const COMBINATION_TYPES = [
  "analogous",
  "complementary",
  "triadic",
  "split-complementary",
  "monochromatic",
  "neutral",
] as const;

type CombinationType = (typeof COMBINATION_TYPES)[number];

const TYPE_LABELS: Record<CombinationType, string> = {
  analogous: "Analogous",
  complementary: "Complementary",
  triadic: "Triadic",
  "split-complementary": "Split-Comp",
  monochromatic: "Monochromatic",
  neutral: "Neutral",
};

// ── Skeleton ─────────────────────────────────

function PaletteSkeleton() {
  return (
    <div className="border border-stone-200 rounded-xl overflow-hidden bg-white animate-pulse">
      <div className="h-10 bg-stone-200" />
      <div className="px-4 py-3 space-y-2">
        <div className="h-3 bg-stone-100 rounded w-24" />
        <div className="h-4 bg-stone-100 rounded w-40" />
        <div className="flex gap-1 mt-2">
          <div className="h-4 w-12 bg-stone-100 rounded-full" />
          <div className="h-4 w-14 bg-stone-100 rounded-full" />
        </div>
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────

export default function PalettesPage() {
  const router = useRouter();

  const [palettes, setPalettes] = useState<MatchedPalette[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [activeTypes, setActiveTypes] = useState<Set<CombinationType>>(
    new Set(),
  );
  const [activeMoods, setActiveMoods] = useState<Set<string>>(new Set());

  // ── Fetch ────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const data = await getPalettes();
        if (!cancelled) {
          setPalettes(data.palettes);
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof ApiError
              ? err.message
              : "Could not load palettes. Is the backend running?";
          setError(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Derived filter options ───────────────────
  // Collect all unique mood tags from the fetched palettes

  const allMoodTags = useMemo(() => {
    const tags = new Set<string>();
    palettes.forEach((p) => p.mood_tags.forEach((t) => tags.add(t)));
    return Array.from(tags).sort();
  }, [palettes]);

  // ── Filtered results ─────────────────────────

  const filtered = useMemo(() => {
    return palettes.filter((p) => {
      const typeMatch =
        activeTypes.size === 0 ||
        activeTypes.has(p.combination_type as CombinationType);
      const moodMatch =
        activeMoods.size === 0 || p.mood_tags.some((t) => activeMoods.has(t));
      return typeMatch && moodMatch;
    });
  }, [palettes, activeTypes, activeMoods]);

  // ── Toggle helpers ───────────────────────────

  function toggleType(t: CombinationType) {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      next.has(t) ? next.delete(t) : next.add(t);
      return next;
    });
  }

  function toggleMood(m: string) {
    setActiveMoods((prev) => {
      const next = new Set(prev);
      next.has(m) ? next.delete(m) : next.add(m);
      return next;
    });
  }

  function clearFilters() {
    setActiveTypes(new Set());
    setActiveMoods(new Set());
  }

  const hasActiveFilters = activeTypes.size > 0 || activeMoods.size > 0;

  // ── Render ───────────────────────────────────

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      {/* ── Nav ──────────────────────────────── */}
      <header className="border-b border-stone-200 bg-white/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => router.push("/")}
            className="font-display text-xl font-semibold text-stone-900 hover:text-stone-600 transition-colors"
          >
            ChromaFit
          </button>

          <div className="flex items-center gap-3">
            <span className="text-[11px] text-stone-400 hidden sm:inline">
              Sanzo Wada · Palette Library
            </span>
            <button
              onClick={() => router.push("/")}
              className="text-xs text-stone-400 hover:text-stone-600 transition-colors border border-stone-200 rounded-lg px-3 py-1.5"
            >
              ← Analyze wardrobe
            </button>
          </div>
        </div>
      </header>

      {/* ── Page header ──────────────────────── */}
      <div className="max-w-5xl mx-auto w-full px-6 pt-10 pb-6">
        <div className="animate-fade-up">
          <p className="text-[11px] uppercase tracking-widest text-stone-400 font-medium mb-1">
            Reference Library
          </p>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold text-stone-900 leading-tight">
            Sanzo Wada Palettes
          </h1>
          <p className="mt-3 text-sm text-stone-500 max-w-lg leading-relaxed">
            Every palette ChromaFit matches against — drawn from{" "}
            <em>A Dictionary of Color Combinations</em> (1933). Colors are
            matched using Delta-E CIE2000 distance in LAB color space.
          </p>
        </div>

        {/* ── Filters ────────────────────────── */}
        {!loading && !error && (
          <div className="mt-8 space-y-4 animate-fade-up">
            {/* Combination type pills */}
            <div>
              <p className="text-[10px] uppercase tracking-widest text-stone-400 font-medium mb-2">
                Harmony Type
              </p>
              <div className="flex flex-wrap gap-2">
                {COMBINATION_TYPES.map((t) => (
                  <button
                    key={t}
                    onClick={() => toggleType(t)}
                    className={`
                      text-[11px] rounded-full px-3 py-1 border transition-all
                      ${
                        activeTypes.has(t)
                          ? "bg-stone-900 text-white border-stone-900"
                          : "bg-white text-stone-500 border-stone-200 hover:border-stone-400"
                      }
                    `}
                  >
                    {TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>

            {/* Mood tag pills */}
            {allMoodTags.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-stone-400 font-medium mb-2">
                  Mood
                </p>
                <div className="flex flex-wrap gap-2">
                  {allMoodTags.map((m) => (
                    <button
                      key={m}
                      onClick={() => toggleMood(m)}
                      className={`
                        text-[11px] rounded-full px-3 py-1 border capitalize transition-all
                        ${
                          activeMoods.has(m)
                            ? "bg-stone-700 text-white border-stone-700"
                            : "bg-white text-stone-500 border-stone-200 hover:border-stone-400"
                        }
                      `}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Result count + clear */}
            <div className="flex items-center justify-between pt-1">
              <p className="text-xs text-stone-400">
                {hasActiveFilters ? (
                  <>
                    <span className="text-stone-700 font-medium">
                      {filtered.length}
                    </span>{" "}
                    of {palettes.length} palettes
                  </>
                ) : (
                  <>
                    <span className="text-stone-700 font-medium">
                      {palettes.length}
                    </span>{" "}
                    palettes total
                  </>
                )}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-[11px] text-stone-400 hover:text-stone-600 underline underline-offset-2 transition-colors"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Grid ─────────────────────────────── */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 pb-16">
        {/* Loading skeletons */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(9)].map((_, i) => (
              <PaletteSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className="p-6 border border-red-200 rounded-xl bg-red-50 text-red-600 text-sm max-w-lg">
            <p className="font-medium mb-1">Could not load palettes</p>
            <p className="text-red-500 font-light">{error}</p>
          </div>
        )}

        {/* Empty filter result */}
        {!loading && !error && filtered.length === 0 && (
          <div className="text-center py-20">
            <p className="text-stone-400 text-sm">
              No palettes match the selected filters.
            </p>
            <button
              onClick={clearFilters}
              className="mt-3 text-xs text-stone-500 underline underline-offset-2 hover:text-stone-700 transition-colors"
            >
              Clear filters
            </button>
          </div>
        )}

        {/* Palette grid */}
        {!loading && !error && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((palette) => (
              <div key={palette.palette_id} className="animate-fade-up">
                <PaletteMatchCard palette={palette} compact={false} />
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ── Footer ───────────────────────────── */}
      <footer className="border-t border-stone-200 py-5">
        <p className="text-center text-xs text-stone-400">
          ChromaFit · AMD Developer Hackathon · lablab.ai · May 2026
        </p>
      </footer>
    </div>
  );
}
