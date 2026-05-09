"use client";

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html>
      <body className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-4xl mb-4">💥</p>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            ChromaFit encountered a critical error
          </h2>
          <button
            onClick={reset}
            className="px-5 py-2 bg-gray-900 text-white text-sm rounded-full"
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
