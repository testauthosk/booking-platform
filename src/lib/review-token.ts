import { createHmac } from 'crypto';

const SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'fallback-review-secret';

export function generateReviewToken(bookingId: string): string {
  return createHmac('sha256', SECRET + '-review')
    .update(bookingId)
    .digest('hex')
    .substring(0, 16);
}

export function verifyReviewToken(bookingId: string, token: string): boolean {
  return token === generateReviewToken(bookingId);
}

export function buildReviewUrl(bookingId: string, baseUrl?: string): string {
  const token = generateReviewToken(bookingId);
  const base = baseUrl || process.env.NEXTAUTH_URL || 'https://booking-platform-production-7d5d.up.railway.app';
  return `${base}/review/${bookingId}?token=${token}`;
}
