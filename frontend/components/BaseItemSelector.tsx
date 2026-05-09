"use client";

// ─────────────────────────────────────────────
// BaseItemSelector
// Shown after images are uploaded.
// User can tap one thumbnail to set it as the
// anchor item, or leave unselected (free mode).
// ─────────────────────────────────────────────

interface PreviewItem {
  index: number;
  file: File;
  previewUrl: string;
}

interface Props {
  items: PreviewItem[];
  selectedIndex: number | null;
  onSelect: (index: number | null) => void;
}

export default function BaseItemSelector({
  items,
  selectedIndex,
  onSelect,
}: Props) {
  const handleTap = (index: number) => {
    // Tapping the selected item deselects it
    onSelect(selectedIndex === index ? null : index);
  };

  return (
    <div className="mt-8 border-t border-stone-200 pt-6">
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm font-medium text-stone-700">
          Pick an anchor item{" "}
          <span className="font-normal text-stone-400">(optional)</span>
        </p>
        {selectedIndex !== null && (
          <button
            onClick={() => onSelect(null)}
            className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
          >
            Clear selection
          </button>
        )}
      </div>
      <p className="text-xs text-stone-400 mb-4">
        The anchor item is always included in every outfit suggestion. Leave
        unselected and ChromaFit will choose the best combinations freely.
      </p>

      {/* Mode badge */}
      <div className="mb-4">
        {selectedIndex !== null ? (
          <span className="inline-flex items-center gap-1.5 text-xs bg-stone-900 text-white rounded-full px-3 py-1">
            <span>⚓</span>
            <span>Anchored mode</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs bg-stone-100 text-stone-500 rounded-full px-3 py-1">
            <span>✦</span>
            <span>Free recommendation mode</span>
          </span>
        )}
      </div>

      {/* Thumbnail grid */}
      <div className="flex flex-wrap gap-3">
        {items.map((item) => {
          const isSelected = selectedIndex === item.index;
          return (
            <button
              key={item.index}
              onClick={() => handleTap(item.index)}
              className={`relative w-20 h-20 rounded-xl overflow-hidden border-2 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 ${
                isSelected
                  ? "border-stone-900 ring-2 ring-stone-900 ring-offset-2 scale-105"
                  : "border-stone-200 hover:border-stone-400"
              }`}
              aria-pressed={isSelected}
              aria-label={`Select item ${item.index + 1} as anchor`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.previewUrl}
                alt={`Item ${item.index + 1}`}
                className="w-full h-full object-cover"
              />
              {/* Anchor overlay */}
              {isSelected && (
                <div className="absolute inset-0 bg-stone-900/40 flex items-center justify-center">
                  <span className="text-white text-lg drop-shadow">⚓</span>
                </div>
              )}
              {/* Index label */}
              <div
                className={`absolute bottom-0 inset-x-0 text-center text-[10px] py-0.5 ${
                  isSelected
                    ? "bg-stone-900 text-white"
                    : "bg-white/80 text-stone-500"
                }`}
              >
                #{item.index + 1}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
