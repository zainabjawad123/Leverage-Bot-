"use client";

import React from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-2 text-red-700">
            Something went wrong!
          </h2>
          <p className="text-red-600 mb-4">
            {error.message || "An unexpected error occurred"}
          </p>
          <button
            onClick={reset}
            className="bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    </main>
  );
}
