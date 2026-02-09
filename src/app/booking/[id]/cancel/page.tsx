'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export default function CancelBookingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const bookingId = params.id as string;
  const token = searchParams.get('token') || '';

  const [status, setStatus] = useState<'loading' | 'confirm' | 'success' | 'error'>('confirm');
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const res = await fetch('/api/public/booking/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, token }),
      });

      if (res.ok) {
        setStatus('success');
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error || 'Помилка скасування');
        setStatus('error');
      }
    } catch {
      setError('Помилка зʼєднання');
      setStatus('error');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border p-8 text-center">
        {status === 'confirm' && (
          <>
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-amber-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              Скасувати запис?
            </h1>
            <p className="text-gray-500 mb-8 text-sm">
              Ви впевнені що хочете скасувати бронювання? Цю дію не можна відмінити.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => window.close()}
                className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors"
              >
                Ні, залишити
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="flex-1 py-3 px-4 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {cancelling && <Loader2 className="w-4 h-4 animate-spin" />}
                Так, скасувати
              </button>
            </div>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              Запис скасовано
            </h1>
            <p className="text-gray-500 text-sm">
              Якщо передумаєте — запишіться знову через сайт.
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              Помилка
            </h1>
            <p className="text-gray-500 text-sm">
              {error}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
