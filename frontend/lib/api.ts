// ─────────────────────────────────────────────
// ChromaFit — API Client (lib/api.ts)
//
// Toggle between mock and real backend:
//   NEXT_PUBLIC_USE_MOCK=true  → returns mock data, no network calls
//   NEXT_PUBLIC_USE_MOCK=false → hits FastAPI backend
//
// All fetch() calls live here. Never call fetch()
// directly from a component.
// ─────────────────────────────────────────────

import { AnalysisResponse } from "./types";
import { MOCK_ANCHORED, MOCK_FREE } from "./mock-data";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

// Simulates network latency so the loading screen steps
// play out naturally during mock mode.
function mockDelay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public detail?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail: string | undefined;
    try {
      const body = await res.json();
      detail = body?.detail ?? undefined;
    } catch {
      // ignore parse error
    }
    throw new ApiError(res.status, `Request failed: ${res.status}`, detail);
  }
  return res.json() as Promise<T>;
}

// POST /api/analyze
// Uploads wardrobe images and triggers the full ChromaFit pipeline.
// base_item_index omitted → free mode; provided → anchored mode.
export async function analyzeWardrobe(
  images: File[],
  baseItemIndex?: number,
): Promise<AnalysisResponse> {
  if (USE_MOCK) {
    // Simulate the ~7s backend processing time so the
    // loading progress steps are visible to reviewers.
    await mockDelay(7500);

    const result =
      baseItemIndex !== undefined
        ? { ...MOCK_ANCHORED, base_item_index: baseItemIndex }
        : MOCK_FREE;

    // Store in sessionStorage so the results page
    // renders instantly without a second mock fetch.
    sessionStorage.setItem(
      `chromafit_session_${result.session_id}`,
      JSON.stringify(result),
    );

    return result;
  }

  const form = new FormData();

  for (const image of images) {
    form.append("images[]", image);
  }

  if (baseItemIndex !== undefined) {
    form.append("base_item_index", String(baseItemIndex));
  }

  const res = await fetch(`${API_BASE}/api/analyze`, {
    method: "POST",
    body: form,
  });

  return handleResponse<AnalysisResponse>(res);
}

// GET /api/sessions/{sessionId}
// Retrieves a stored analysis result by session ID.
export async function getSession(sessionId: string): Promise<AnalysisResponse> {
  if (USE_MOCK) {
    await mockDelay(300);
    // Results page checks sessionStorage first, but if someone
    // navigates directly to a mock URL, serve a fixture by pattern.
    if (sessionId.includes("anchored")) return MOCK_ANCHORED;
    return MOCK_FREE;
  }

  const res = await fetch(`${API_BASE}/api/sessions/${sessionId}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  return handleResponse<AnalysisResponse>(res);
}
