import { AnalysisResponse } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";

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

export async function analyzeWardrobe(
  images: File[],
  baseItemIndex?: number,
): Promise<AnalysisResponse> {
  const form = new FormData();

  for (const image of images) {
    form.append("images", image);
  }

  if (baseItemIndex !== undefined) {
    form.append("base_item_index", String(baseItemIndex));
  }

  const res = await fetch(`${API_BASE}/api/analyze`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    let message = "An unexpected error occurred.";

    if (errorBody?.detail) {
      if (typeof errorBody.detail === "string") {
        message = errorBody.detail;
      } else if (Array.isArray(errorBody.detail)) {
        message = errorBody.detail
          .map((e: { msg?: string; loc?: string[] }) =>
            e.loc
              ? `${e.loc.slice(1).join(".")}: ${e.msg}`
              : (e.msg ?? "Validation error"),
          )
          .join("; ");
      }
    }

    throw new ApiError(res.status, message, errorBody?.detail);
  }

  return res.json() as Promise<AnalysisResponse>;
}

export async function getSession(sessionId: string): Promise<AnalysisResponse> {
  const res = await fetch(`${API_BASE}/api/sessions/${sessionId}`);

  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    const message =
      typeof errorBody?.detail === "string"
        ? errorBody.detail
        : `Session not found (${res.status})`;
    throw new ApiError(res.status, message, errorBody?.detail);
  }

  return res.json() as Promise<AnalysisResponse>;
}
