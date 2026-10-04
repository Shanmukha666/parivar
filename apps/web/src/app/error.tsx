'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Something went wrong</h2>
      <p className="text-gray-600 mb-6">{error?.message || 'An unexpected error occurred.'}</p>
      <button
        onClick={() => reset()}
        className="px-6 py-3 bg-primary text-white font-medium rounded-xl hover:bg-primary/90 transition-colors"
      >
        Try Again
      </button>
    </div>
  );
}
