"use client";

// ─────────────────────────────────────────────
// ReasoningPanel
// Displays the AI-generated reasoning paragraph
// for an outfit combination. Clean, readable,
// clearly attributed to the model.
// ─────────────────────────────────────────────

interface Props {
  reasoning: string;
  harmonyScore: number;
}

export default function ReasoningPanel({ reasoning, harmonyScore }: Props) {
  // Determine score tier for visual accent color
  const scoreTier =
    harmonyScore >= 80
      ? { label: "Excellent", dot: "bg-emerald-400" }
      : harmonyScore >= 60
        ? { label: "Good", dot: "bg-amber-400" }
        : { label: "Fair", dot: "bg-stone-400" };

  return (
    <div className="bg-stone-50 border border-stone-200 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-2 h-2 rounded-full ${scoreTier.dot}`} />
        <p className="text-[10px] uppercase tracking-widest text-stone-400 font-medium">
          Color Theory Reasoning · {scoreTier.label} Harmony
        </p>
      </div>
      <p className="text-stone-600 text-sm leading-relaxed font-light">
        {reasoning}
      </p>
      <p className="text-[10px] text-stone-400 mt-3 italic">
        Analysis by Qwen2.5-VL · Palette reference: Sanzo Wada&apos;s A
        Dictionary of Color Combinations
      </p>
    </div>
  );
}
