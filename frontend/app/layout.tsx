import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import "./globals.css";

// Display font — editorial, fashion-adjacent
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

// Body font — clean, readable
const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ChromaFit — Your wardrobe, decoded by color theory.",
  description:
    "ChromaFit uses Qwen2.5-VL on AMD MI300X to analyze your wardrobe and recommend outfits grounded in Sanzo Wada's century-old color harmony principles.",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎨</text></svg>",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // next/font injects the CSS variables; we reference them in globals.css @theme
    <html lang="en" className={`${cormorant.variable} ${dmSans.variable}`}>
      <body
        className="bg-stone-50 text-stone-900 antialiased min-h-screen"
        style={{ fontFamily: "var(--font-body)" }}
      >
        {children}
      </body>
    </html>
  );
}
