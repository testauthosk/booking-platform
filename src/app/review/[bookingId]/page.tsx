'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Star, Loader2, CheckCircle, XCircle } from 'lucide-react';

export default function ReviewPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const bookingId = params.bookingId as string;
  const token = searchParams.get('token') || '';

  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<any>(null);
  const [error, setError] = useState('');
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/public/review?bookingId=${bookingId}&token=${token}`);
        const data = await res.json();
        if (res.ok) {
          setBooking(data);
        } else {
          if (data.alreadyReviewed) {
            setAlreadyReviewed(true);
          }
          setError(data.error || 'Помилка');
        }
      } catch {
        setError('Помилка зʼєднання');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [bookingId, token]);

  const handleSubmit = async () => {
    if (rating === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/public/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, token, rating, text: text.trim() || undefined }),
      });
      if (res.ok) {
        setSubmitted(true);
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error || 'Помилка');
      }
    } catch {
      setError('Помилка зʼєднання');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border p-8">
        {/* Already reviewed */}
        {alreadyReviewed && (
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Дякуємо!</h1>
            <p className="text-gray-500 text-sm">Ви вже залишили відгук для цього візиту.</p>
          </div>
        )}

        {/* Error */}
        {error && !alreadyReviewed && (
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Помилка</h1>
            <p className="text-gray-500 text-sm">{error}</p>
          </div>
        )}

        {/* Success */}
        {submitted && (
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Дякуємо за відгук!</h1>
            <p className="text-gray-500 text-sm">Ваша оцінка допомагає іншим клієнтам.</p>
          </div>
        )}

        {/* Review form */}
        {booking && !submitted && !error && (
          <>
            {/* Salon header */}
            <div className="text-center mb-6">
              {booking.salonLogo && (
                <img src={booking.salonLogo} alt="" className="w-14 h-14 rounded-full mx-auto mb-3 object-cover" />
              )}
              <h1 className="text-lg font-bold text-gray-900">{booking.salonName}</h1>
              <p className="text-sm text-gray-500 mt-1">Як вам візит?</p>
            </div>

            {/* Booking info */}
            <div className="bg-gray-50 rounded-xl p-4 mb-6 text-sm">
              <div className="flex justify-between mb-1">
                <span className="text-gray-500">Послуга</span>
                <span className="font-medium text-gray-900">{booking.serviceName}</span>
              </div>
              <div className="flex justify-between mb-1">
                <span className="text-gray-500">Майстер</span>
                <span className="font-medium text-gray-900">{booking.masterName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Дата</span>
                <span className="font-medium text-gray-900">{booking.date} о {booking.time}</span>
              </div>
            </div>

            {/* Star rating */}
            <div className="text-center mb-6">
              <p className="text-sm font-medium text-gray-700 mb-3">Ваша оцінка</p>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="transition-transform hover:scale-110 active:scale-95"
                  >
                    <Star
                      className={`w-10 h-10 ${
                        star <= (hoverRating || rating)
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-gray-300'
                      } transition-colors`}
                    />
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {rating === 0 && 'Натисніть на зірку'}
                {rating === 1 && 'Жахливо'}
                {rating === 2 && 'Погано'}
                {rating === 3 && 'Нормально'}
                {rating === 4 && 'Добре'}
                {rating === 5 && 'Чудово!'}
              </p>
            </div>

            {/* Text */}
            <div className="mb-6">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value.substring(0, 1000))}
                placeholder="Розкажіть про ваш досвід (необовʼязково)"
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none transition-all text-sm resize-none"
              />
              <p className="text-[11px] text-gray-400 mt-1 text-right">{text.length}/1000</p>
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={rating === 0 || submitting}
              className="w-full py-3 px-4 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-xl transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Залишити відгук
            </button>
          </>
        )}
      </div>
    </div>
  );
}
