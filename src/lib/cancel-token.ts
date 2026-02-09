import { createHmac } from 'crypto';

const SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'fallback-cancel-secret';

/**
 * Generate a cancel token for a booking.
 * Used in cancel URLs sent to clients.
 */
export function generateCancelToken(bookingId: string): string {
  return createHmac('sha256', SECRET)
    .update(bookingId)
    .digest('hex')
    .substring(0, 16);
}

/**
 * Verify a cancel token.
 */
export function verifyCancelToken(bookingId: string, token: string): boolean {
  const expected = generateCancelToken(bookingId);
  return token === expected;
}

/**
 * Build a cancel URL for a booking.
 */
export function buildCancelUrl(bookingId: string, baseUrl?: string): string {
  const token = generateCancelToken(bookingId);
  const base = baseUrl || process.env.NEXTAUTH_URL || 'https://booking-platform-production-7d5d.up.railway.app';
  return `${base}/booking/${bookingId}/cancel?token=${token}`;
}
