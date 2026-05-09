"use client";

// ─────────────────────────────────────────────
// ChromaFit Upload Page (app/page.tsx)
// Drag-and-drop wardrobe intake → BaseItemSelector
// → animated loading state → redirect to results
// ─────────────────────────────────────────────

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import WardrobeUploader, { PreviewItem } from "@/components/WardrobeUploader";
import BaseItemSelector from "@/components/BaseItemSelector";
import { analyzeWardrobe, ApiError } from "@/lib/api";
import NavBar from "@/components/Navbar";

// ── Loading steps ────────────────────────────

interface LoadingStep {
  id: string;
  icon: string;
  label: string;
}

const STEPS: LoadingStep[] = [
  { id: "upload", icon: "⬆", label: "Uploading wardrobe items" },
  { id: "analyze", icon: "🔍", label: "Analyzing clothing types" },
  { id: "extract", icon: "🎨", label: "Extracting color palettes" },
  { id: "match", icon: "📚", label: "Matching against Sanzo Wada palettes" },
  { id: "combine", icon: "✨", label: "Building outfit combinations" },
];

// Optimistic timing (ms) for each step before API resolves
const STEP_DELAYS = [0, 1200, 2600, 4200, 6000];

// ── Main component ───────────────────────────

type UploadPhase = "upload" | "loading" | "error";

export default function UploadPage() {
  const router = useRouter();

  const [items, setItems] = useState<PreviewItem[]>([]);
  const [selectedAnchor, setAnchor] = useState<number | null>(null);
  const [phase, setPhase] = useState<UploadPhase>("upload");
  const [activeStepIdx, setActiveStepIdx] = useState(0);
  const [doneSteps, setDoneSteps] = useState<Set<string>>(new Set());
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const hasMin = items.length >= 3;

  // ── Optimistic step advancement ─────────────

  const runOptimisticSteps = useCallback(() => {
    STEP_DELAYS.forEach((delay, idx) => {
      setTimeout(() => {
        setActiveStepIdx(idx);
        if (idx > 0) {
          setDoneSteps((prev) => {
            const next = new Set(prev);
            next.add(STEPS[idx - 1].id);
            return next;
          });
        }
      }, delay);
    });
  }, []);

  // ── Submit handler ───────────────────────────

  const handleSubmit = async () => {
    if (!hasMin) return;

    setPhase("loading");
    setActiveStepIdx(0);
    setDoneSteps(new Set());
    setErrorMsg(null);

    runOptimisticSteps();

    try {
      const files = items.map((item) => item.file);
      // Remap selectedAnchor (which is PreviewItem.index) to array position
      const anchorPosition =
        selectedAnchor !== null
          ? items.findIndex((item) => item.index === selectedAnchor)
          : undefined;

      const result = await analyzeWardrobe(
        files,
        anchorPosition !== -1 ? anchorPosition : undefined,
      );

      // Mark all steps done before navigating
      setDoneSteps(new Set(STEPS.map((s) => s.id)));

      setTimeout(() => {
        router.push(`/results/${result.session_id}`);
      }, 400);
    } catch (err) {
      let msg = "Something went wrong. Please try again.";
      if (err instanceof ApiError) {
        msg = err.detail ?? err.message;
      }
      setPhase("error");
      setErrorMsg(msg);
    }
  };

  // ── Loading screen ───────────────────────────

  if (phase === "loading") {
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center px-6">
        {/* Brand */}
        <p className="font-display text-2xl text-stone-100 mb-1 tracking-wide">
          ChromaFit
        </p>
        <p className="text-xs text-stone-500 mb-16 tracking-widest uppercase">
          Analyzing your wardrobe
        </p>

        {/* Steps */}
        <div className="w-full max-w-md space-y-5">
          {STEPS.map((step, idx) => {
            const isDone = doneSteps.has(step.id);
            const isActive = activeStepIdx === idx && !isDone;
            const isPending = idx > activeStepIdx && !isDone;

            return (
              <div
                key={step.id}
                className={`flex items-center gap-4 transition-opacity duration-500 ${
                  isPending ? "opacity-30" : "opacity-100"
                }`}
              >
                {/* Status indicator */}
                <div className="shrink-0 w-7 flex items-center justify-center">
                  {isDone ? (
                    <span className="text-emerald-400 text-base">✓</span>
                  ) : isActive ? (
                    <span className="animate-pulse-dot text-stone-300 text-base">
                      {step.icon}
                    </span>
                  ) : (
                    <span className="text-stone-600 text-base">
                      {step.icon}
                    </span>
                  )}
                </div>

                {/* Label */}
                <div className="flex-1">
                  <p
                    className={`text-sm transition-colors duration-300 ${
                      isDone
                        ? "text-stone-500 line-through decoration-stone-600"
                        : isActive
                          ? "text-stone-100 font-medium"
                          : "text-stone-600"
                    }`}
                  >
                    {step.label}
                  </p>
                  {isActive && (
                    <div className="mt-1.5 h-0.5 rounded-full bg-stone-800 overflow-hidden w-48">
                      <div className="h-full animate-shimmer rounded-full bg-stone-600" />
                    </div>
                  )}
                </div>

                {/* Done tag */}
                {isDone && (
                  <span className="text-[10px] text-emerald-600 uppercase tracking-widest font-medium">
                    done
                  </span>
                )}
                {isActive && (
                  <span className="text-[10px] text-stone-400 uppercase tracking-widest animate-pulse-dot">
                    processing
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Tagline at bottom */}
        <p className="text-stone-700 text-xs mt-20 text-center max-w-xs leading-relaxed">
          Qwen2.5-VL running on AMD Instinct MI300X · Powered by ROCm
        </p>
      </div>
    );
  }

  // ── Upload screen ────────────────────────────

  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <NavBar
        title="ChromaFit"
        links={[
          { label: "Sessions", href: "/sessions" },
          { label: "Browse palettes ✦", href: "/palettes" },
        ]}
        desktopExtra={
          <div className="text-[10px] text-stone-500 text-right">
            <p>Qwen2.5-VL · AMD MI300X</p>
            <p>Sanzo Wada Palettes</p>
          </div>
        }
      />

      {/* Main */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-10">
        {/* Hero copy */}
        <div className="mb-10">
          <h2 className="font-display text-4xl sm:text-5xl font-semibold text-stone-900 leading-tight">
            Upload your wardrobe.
            <br />
            <span className="text-stone-600/80 font-normal italic">
              Discover harmony.
            </span>
          </h2>
          <p className="mt-4 text-stone-500 text-sm max-w-lg leading-relaxed">
            Add 3–10 photos of clothing items. ChromaFit uses computer vision
            and Sanzo Wada&apos;s color theory to find outfits that actually
            work together.
          </p>
        </div>

        {/* Upload zone */}
        <WardrobeUploader items={items} onItemsChange={setItems} />

        {/* Base item selector — appears once items are uploaded */}
        {items.length > 0 && (
          <BaseItemSelector
            items={items}
            selectedIndex={selectedAnchor}
            onSelect={setAnchor}
          />
        )}

        {/* Error */}
        {phase === "error" && errorMsg && (
          <div className="mt-6 p-4 border border-red-200 rounded-xl bg-red-50 text-red-600 text-sm">
            <p className="font-medium mb-0.5">Analysis failed</p>
            <p className="text-red-500 font-light">{errorMsg}</p>
          </div>
        )}

        {/* Submit */}
        <div className="mt-8 flex items-center gap-4">
          <button
            onClick={handleSubmit}
            disabled={!hasMin}
            className={`
              px-8 py-3.5 rounded-xl text-sm font-medium transition-all
              ${
                hasMin
                  ? "bg-stone-900 text-white hover:bg-stone-800 active:scale-95 shadow-sm"
                  : "bg-stone-200 text-stone-400/80 cursor-not-allowed"
              }
            `}
          >
            {selectedAnchor !== null
              ? "Analyze with anchor ⚓"
              : "Analyze wardrobe ✦"}
          </button>

          {!hasMin && items.length > 0 && (
            <p className="text-xs text-stone-400">
              Add {3 - items.length} more item
              {3 - items.length !== 1 ? "s" : ""} to continue
            </p>
          )}
          {!hasMin && items.length === 0 && (
            <p className="text-xs text-stone-400">
              Upload at least 3 wardrobe photos
            </p>
          )}
        </div>

        {/* How it works — minimal, for context */}
        <div className="mt-16 border-t border-stone-200 pt-10 grid grid-cols-1 sm:grid-cols-3 gap-8">
          {[
            {
              n: "01",
              title: "Vision Analysis",
              body: "Qwen2.5-VL identifies each item's type, cut, and extracts dominant hex colors — all in one inference pass on AMD MI300X.",
            },
            {
              n: "02",
              title: "Wada Matching",
              body: "Colors are matched against Sanzo Wada's A Dictionary of Color Combinations using Delta-E CIE2000 — perceptually accurate, not just RGB.",
            },
            {
              n: "03",
              title: "Harmony Ranking",
              body: "Outfits are ranked by a harmony score combining palette fit, subtype diversity, and seasonal overlap.",
            },
          ].map(({ n, title, body }) => (
            <div key={n}>
              <p className="font-display text-3xl text-stone-800 font-semibold mb-2">
                {n}
              </p>
              <p className="text-sm font-medium text-stone-600 mb-1">{title}</p>
              <p className="text-xs text-stone-600/80 leading-relaxed">
                {body}
              </p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200 py-5">
        <p className="text-center text-xs text-stone-600">
          ChromaFit · AMD Developer Hackathon · lablab.ai · May 2026
        </p>
      </footer>
    </div>
  );
}
