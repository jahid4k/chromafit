"use client";

// ─────────────────────────────────────────────
// ColorSwatchBar
// Displays a row of hex color swatches with
// tooltips showing the color name on hover.
// ─────────────────────────────────────────────

interface Props {
  colors: string[]; // hex values e.g. ["#2C3E50", "#BDC3C7"]
  colorNames: string[]; // human-readable names, parallel array
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8",
};

export default function ColorSwatchBar({
  colors,
  colorNames,
  size = "md",
}: Props) {
  const swatchClass = sizeMap[size];

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {colors.map((hex, i) => (
        <div key={hex} className="relative group">
          <div
            className={`${swatchClass} rounded-full border border-black/10 shadow-sm cursor-default transition-transform group-hover:scale-110`}
            style={{ backgroundColor: hex }}
            aria-label={colorNames[i] ?? hex}
          />
          {/* Tooltip */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-stone-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
            <span className="font-mono text-[10px] text-stone-400 block">
              {hex}
            </span>
            <span className="font-medium">{colorNames[i] ?? hex}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
