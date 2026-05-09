"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center max-w-md">
        <p className="text-4xl mb-4">⚠️</p>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          Something went wrong
        </h2>
        <p className="text-gray-500 text-sm mb-6">
          {error.message ?? "An unexpected error occurred."}
        </p>
        <button
          onClick={reset}
          className="px-5 py-2 bg-gray-900 text-white text-sm rounded-full hover:bg-gray-700 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
