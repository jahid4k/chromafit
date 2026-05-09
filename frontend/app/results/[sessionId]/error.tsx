"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ResultsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const router = useRouter();

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center max-w-md">
        <p className="text-4xl mb-4">🎨</p>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          Couldn&apos;t load this session
        </h2>
        <p className="text-gray-500 text-sm mb-6">
          {error.message ??
            "The session may have expired or the analysis failed."}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-5 py-2 border border-gray-300 text-gray-700 text-sm rounded-full hover:bg-gray-50 transition-colors"
          >
            Retry
          </button>
          <button
            onClick={() => router.push("/")}
            className="px-5 py-2 bg-gray-900 text-white text-sm rounded-full hover:bg-gray-700 transition-colors"
          >
            Upload new wardrobe
          </button>
        </div>
      </div>
    </div>
  );
}
