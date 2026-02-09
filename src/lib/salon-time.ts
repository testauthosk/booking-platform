/**
 * Salon timezone utilities.
 * All booking dates/times are "naive" — they represent salon local time.
 * This module converts between salon local time and UTC for comparisons.
 */

/**
 * Get current date/time in salon's timezone.
 * Returns { date: "YYYY-MM-DD", time: "HH:MM", epoch: number }
 */
export function nowInSalonTz(timezone: string): { date: string; time: string; epoch: number } {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = fmt.formatToParts(now);
  const get = (type: string) => parts.find(p => p.type === type)?.value || '00';

  const date = `${get('year')}-${get('month')}-${get('day')}`;
  const time = `${get('hour')}:${get('minute')}`;

  return { date, time, epoch: now.getTime() };
}

/**
 * Convert salon local date+time to a comparable epoch (ms).
 * Since we just need relative comparison (is booking in the past?),
 * we convert both sides to salon-local "pseudo-epoch".
 */
export function salonDateTimeToMinutes(date: string, time: string): number {
  const [y, m, d] = date.split('-').map(Number);
  const [h, min] = time.split(':').map(Number);
  // Minutes since epoch-ish (just for comparison, not absolute)
  return ((y * 12 + (m - 1)) * 31 + (d - 1)) * 1440 + h * 60 + min;
}

/**
 * Difference in milliseconds between a booking datetime and "now" in salon timezone.
 * Positive = booking is in the future.
 */
export function msUntilBooking(
  bookingDate: string,
  bookingTime: string,
  timezone: string
): number {
  const now = nowInSalonTz(timezone);
  const nowMin = salonDateTimeToMinutes(now.date, now.time);
  const bookMin = salonDateTimeToMinutes(bookingDate, bookingTime);
  return (bookMin - nowMin) * 60 * 1000;
}

/**
 * Get today's date string in salon timezone.
 */
export function todayInSalonTz(timezone: string): string {
  return nowInSalonTz(timezone).date;
}

/**
 * Add N days to a date string. Returns "YYYY-MM-DD".
 */
export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00Z'); // noon to avoid DST edge
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
