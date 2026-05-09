"use client";

// ─────────────────────────────────────────────
// ChromaFit — Shared NavBar
// Responsive header used on all pages.
// Desktop: logo + nav links inline
// Mobile: logo + hamburger → slide-down menu
// ─────────────────────────────────────────────

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export interface NavLink {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface Props {
  /** Left side: always visible */
  title?: string;
  onTitleClick?: () => void;
  /** Right side: desktop shows all, mobile shows in hamburger menu */
  links?: NavLink[];
  /** Optional inline badge/pill shown on desktop only (e.g. mode badge on results page) */
  desktopExtra?: React.ReactNode;
  /** Optional small secondary text shown on desktop only (e.g. "Analyzed in 5.2s") */
  desktopMeta?: string;
}

export default function NavBar({
  title = "ChromaFit",
  onTitleClick,
  links = [],
  desktopExtra,
  desktopMeta,
}: Props) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  function handleTitleClick() {
    if (onTitleClick) onTitleClick();
    else router.push("/");
  }

  return (
    <header className="border-b border-stone-200 bg-white/80 backdrop-blur-sm sticky top-0 z-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
        {/* ── Logo ──────────────────────────── */}
        <button
          onClick={handleTitleClick}
          className="font-display text-xl sm:text-2xl font-semibold text-stone-900 hover:text-stone-600 transition-colors shrink-0"
        >
          {title}
        </button>

        {/* ── Desktop nav ───────────────────── */}
        <div className="hidden sm:flex items-center gap-2">
          {desktopMeta && (
            <span className="text-[11px] text-stone-400 mr-1">
              {desktopMeta}
            </span>
          )}
          {desktopExtra && desktopExtra}
          {links.map((link, i) => (
            <NavLinkButton key={i} link={link} onClose={() => {}} />
          ))}
        </div>

        {/* ── Mobile: hamburger ─────────────── */}
        <div className="sm:hidden relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
            className="w-9 h-9 flex flex-col items-center justify-center gap-1.5 rounded-lg border border-stone-200 bg-white hover:border-stone-400 transition-colors"
          >
            <span
              className={`block w-4 h-px bg-stone-600 transition-all duration-200 ${
                menuOpen ? "rotate-45 translate-y-1.25" : ""
              }`}
            />
            <span
              className={`block w-4 h-px bg-stone-600 transition-all duration-200 ${
                menuOpen ? "opacity-0" : ""
              }`}
            />
            <span
              className={`block w-4 h-px bg-stone-600 transition-all duration-200 ${
                menuOpen ? "-rotate-45 -translate-y-1.25" : ""
              }`}
            />
          </button>

          {/* Dropdown menu */}
          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-stone-200 rounded-xl shadow-lg overflow-hidden z-30">
              {/* Mode badge in mobile menu if present */}
              {desktopExtra && (
                <div className="px-4 py-3 border-b border-stone-100">
                  {desktopExtra}
                </div>
              )}
              {desktopMeta && (
                <div className="px-4 py-2 border-b border-stone-100">
                  <p className="text-[11px] text-stone-400">{desktopMeta}</p>
                </div>
              )}
              {links.map((link, i) => (
                <NavLinkButton
                  key={i}
                  link={link}
                  mobile
                  onClose={() => setMenuOpen(false)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

// ── Internal link button ──────────────────────

function NavLinkButton({
  link,
  mobile = false,
  onClose,
}: {
  link: NavLink;
  mobile?: boolean;
  onClose: () => void;
}) {
  const router = useRouter();

  function handleClick() {
    onClose();
    if (link.onClick) link.onClick();
    else if (link.href) router.push(link.href);
  }

  if (mobile) {
    return (
      <button
        onClick={handleClick}
        className="w-full text-left px-4 py-3 text-sm text-stone-600 hover:bg-stone-50 transition-colors border-b border-stone-100 last:border-0"
      >
        {link.label}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className="text-xs text-stone-400 hover:text-stone-600 transition-colors border border-stone-200 rounded-lg px-3 py-1.5 whitespace-nowrap"
    >
      {link.label}
    </button>
  );
}
