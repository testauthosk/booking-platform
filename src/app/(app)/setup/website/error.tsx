'use client';

import { useEffect } from 'react';

export default function WebsiteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[WEBSITE_ERROR]', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h2 className="text-xl font-bold mb-4">Помилка завантаження</h2>
      <pre className="bg-gray-100 p-4 rounded text-sm max-w-lg overflow-auto mb-4 text-red-600">
        {error.message}
        {'\n\n'}
        {error.stack}
      </pre>
      <button
        onClick={reset}
        className="px-4 py-2 bg-gray-900 text-white rounded"
      >
        Спробувати знову
      </button>
    </div>
  );
}
