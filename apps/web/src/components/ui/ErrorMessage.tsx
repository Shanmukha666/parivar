import React from 'react';

export function ErrorMessage({ title = 'Error', message, onRetry }: { title?: string, message: string, onRetry?: () => void }) {
  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex flex-col items-start gap-2">
      <h3 className="text-red-800 font-semibold">{title}</h3>
      <p className="text-red-600 text-sm">{message}</p>
      {onRetry && (
        <button 
          onClick={onRetry}
          className="mt-2 px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded text-sm font-medium transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
