"use client";

// ─────────────────────────────────────────────
// ChromaFit Session History
// app/sessions/page.tsx
//
// Paginated list of all past analysis sessions.
// Each card shows: thumbnail, mode, item count,
// top outfit names, palette color strip,
// palette name, and harmony score.
// Clicking a card navigates to /results/[id].
// ─────────────────────────────────────────────

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { SessionSummary, SessionsPagination } from "@/lib/types";
import { getSessions, ApiError } from "@/lib/api";

// ── Helpers ───────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return "Unknown date";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Skeleton card ─────────────────────────────

function SessionCardSkeleton() {
  return (
    <div className="border border-stone-200 rounded-2xl overflow-hidden bg-white animate-pulse">
      <div className="aspect-[4/3] bg-stone-100" />
      <div className="p-4 space-y-2">
        <div className="h-3 bg-stone-100 rounded w-20" />
        <div className="h-8 bg-stone-100 rounded w-full" />
        <div className="h-3 bg-stone-100 rounded w-28" />
        <div className="flex gap-1 mt-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex-1 h-5 bg-stone-100 rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Session card ──────────────────────────────

function SessionCard({
  session,
  onClick,
}: {
  session: SessionSummary;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="text-left border border-stone-200 rounded-2xl overflow-hidden bg-white hover:border-stone-400 hover:shadow-md transition-all group w-full"
    >
      {/* Thumbnail */}
      <div className="aspect-[4/3] bg-stone-100 overflow-hidden relative">
        {session.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={session.thumbnail_url}
            alt={session.thumbnail_type ?? "Wardrobe item"}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-stone-300 text-3xl">
            🧥
          </div>
        )}

        {/* Mode badge — top right overlay */}
        <div className="absolute top-3 right-3">
          {session.mode === "anchored" ? (
            <span className="inline-flex items-center gap-1 text-[10px] bg-stone-900/80 backdrop-blur-sm text-white rounded-full px-2 py-0.5">
              <span>⚓</span>
              <span>Anchored</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] bg-white/80 backdrop-blur-sm text-stone-600 rounded-full px-2 py-0.5 border border-stone-200">
              <span>✦</span>
              <span>Free</span>
            </span>
          )}
        </div>

        {/* Harmony score — bottom left overlay */}
        {session.top_harmony_score !== null && (
          <div className="absolute bottom-3 left-3">
            <span className="inline-flex items-center gap-1 text-[10px] bg-white/90 backdrop-blur-sm text-stone-700 rounded-full px-2 py-0.5 border border-stone-100">
              <span className="font-display font-bold text-sm text-stone-900">
                {session.top_harmony_score}
              </span>
              <span className="text-stone-400">harmony</span>
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        {/* Date + item count */}
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] text-stone-400">
            {formatDate(session.created_at)}
          </p>
          <p className="text-[10px] text-stone-400">
            {session.image_count} items
          </p>
        </div>

        {/* Top outfit item names */}
        {session.top_item_names.length > 0 && (
          <p className="text-sm text-stone-700 font-medium capitalize leading-snug mb-3 line-clamp-2">
            {session.top_item_names.join(" · ")}
          </p>
        )}

        {/* Palette color strip */}
        {session.top_palette_colors.length > 0 && (
          <div className="flex h-5 rounded-md overflow-hidden mb-2">
            {session.top_palette_colors.map((color) => (
              <div
                key={color.hex}
                className="flex-1"
                style={{ backgroundColor: color.hex }}
                title={color.name}
              />
            ))}
          </div>
        )}

        {/* Palette name */}
        {session.top_palette_name && (
          <p className="text-[11px] text-stone-500 italic">
            {session.top_palette_name}
          </p>
        )}
      </div>
    </button>
  );
}

// ── Pagination controls ───────────────────────

function Pagination({
  pagination,
  onPageChange,
}: {
  pagination: SessionsPagination;
  onPageChange: (page: number) => void;
}) {
  const { page, total_pages, has_prev, has_next, total } = pagination;

  if (total_pages <= 1) return null;

  // Build page number array with ellipsis
  const pages: (number | "...")[] = [];
  if (total_pages <= 7) {
    for (let i = 1; i <= total_pages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("...");
    for (
      let i = Math.max(2, page - 1);
      i <= Math.min(total_pages - 1, page + 1);
      i++
    ) {
      pages.push(i);
    }
    if (page < total_pages - 2) pages.push("...");
    pages.push(total_pages);
  }

  return (
    <div className="flex items-center justify-between mt-10">
      <p className="text-xs text-stone-400">
        {total} session{total !== 1 ? "s" : ""} total
      </p>

      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={!has_prev}
          className="px-3 py-1.5 text-xs border border-stone-200 rounded-lg text-stone-500 hover:border-stone-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          ← Prev
        </button>

        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`ellipsis-${i}`} className="text-stone-300 text-xs px-1">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p as number)}
              className={`w-8 h-8 text-xs rounded-lg border transition-colors ${
                p === page
                  ? "bg-stone-900 text-white border-stone-900"
                  : "border-stone-200 text-stone-500 hover:border-stone-400"
              }`}
            >
              {p}
            </button>
          ),
        )}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={!has_next}
          className="px-3 py-1.5 text-xs border border-stone-200 rounded-lg text-stone-500 hover:border-stone-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          Next →
        </button>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────

const PAGE_SIZE = 12;

export default function SessionsPage() {
  const router = useRouter();

  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [pagination, setPagination] = useState<SessionsPagination | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRef = useRef(async (page: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSessions(page, PAGE_SIZE);
      setSessions(data.sessions);
      setPagination(data.pagination);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Could not load sessions. Is the backend running?";
      setError(message);
    } finally {
      setLoading(false);
    }
  });

  // loadRef.current is a stable ref — safe to call inside effect without listing as dep
  useEffect(() => {
    loadRef.current(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  function handlePageChange(page: number) {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

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
            <a
              href="/palettes"
              className="text-xs text-stone-400 hover:text-stone-600 transition-colors border border-stone-200 rounded-lg px-3 py-1.5 hidden sm:inline-block"
            >
              Browse palettes ✦
            </a>
            <button
              onClick={() => router.push("/")}
              className="text-xs text-stone-400 hover:text-stone-600 transition-colors border border-stone-200 rounded-lg px-3 py-1.5"
            >
              ← New analysis
            </button>
          </div>
        </div>
      </header>

      {/* ── Page header ──────────────────────── */}
      <div className="max-w-5xl mx-auto w-full px-6 pt-10 pb-6">
        <div className="animate-fade-up">
          <p className="text-[11px] uppercase tracking-widest text-stone-400 font-medium mb-1">
            History
          </p>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold text-stone-900 leading-tight">
            Past Sessions
          </h1>
          <p className="mt-3 text-sm text-stone-500 max-w-lg leading-relaxed">
            Every wardrobe analysis you&apos;ve run. Click any session to view
            the full results.
          </p>
        </div>
      </div>

      {/* ── Content ──────────────────────────── */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 pb-16">
        {/* Loading */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(PAGE_SIZE)].map((_, i) => (
              <SessionCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="p-6 border border-red-200 rounded-xl bg-red-50 text-red-600 text-sm max-w-lg">
            <p className="font-medium mb-1">Could not load sessions</p>
            <p className="text-red-500 font-light">{error}</p>
            <button
              onClick={() => loadRef.current(currentPage)}
              className="mt-3 text-xs underline underline-offset-2 hover:text-red-700 transition-colors"
            >
              Try again
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && sessions.length === 0 && (
          <div className="text-center py-24">
            <p className="font-display text-4xl text-stone-200 mb-4">✦</p>
            <p className="text-stone-400 text-sm mb-6">
              No sessions yet. Upload your wardrobe to get started.
            </p>
            <button
              onClick={() => router.push("/")}
              className="px-6 py-2.5 bg-stone-900 text-white text-sm rounded-xl hover:bg-stone-800 transition-colors"
            >
              Analyze wardrobe
            </button>
          </div>
        )}

        {/* Session grid */}
        {!loading && !error && sessions.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {sessions.map((session) => (
                <SessionCard
                  key={session.session_id}
                  session={session}
                  onClick={() => router.push(`/results/${session.session_id}`)}
                />
              ))}
            </div>

            {pagination && (
              <Pagination
                pagination={pagination}
                onPageChange={handlePageChange}
              />
            )}
          </>
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
