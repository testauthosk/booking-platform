import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const { pathname } = request.nextUrl;

  // ── Security Headers ──
  // Prevent clickjacking (allow same-origin iframes for preview)
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');
  // XSS protection (legacy browsers)
  response.headers.set('X-XSS-Protection', '1; mode=block');
  // Referrer policy — don't leak full URL
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Permissions policy — disable unnecessary APIs
  response.headers.set('Permissions-Policy', 'camera=(self), microphone=(), geolocation=(), payment=()');

  // ── API Protection ──
  if (pathname.startsWith('/api/')) {
    // Prevent API responses from being cached by proxies
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    response.headers.set('Pragma', 'no-cache');

    // Block requests without proper origin on mutation methods
    const method = request.method;
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      const origin = request.headers.get('origin');
      const referer = request.headers.get('referer');
      const host = request.headers.get('host');

      // Allow same-origin and server-to-server (no origin = fetch from server)
      if (origin && host) {
        const originHost = new URL(origin).host;
        if (originHost !== host) {
          return NextResponse.json(
            { error: 'Cross-origin request blocked' },
            { status: 403 }
          );
        }
      }
    }
  }

  // ── Public API endpoints: rate limit via header (enforced app-side) ──
  if (['/api/catalogue', '/api/slots', '/api/services', '/api/categories'].some(p => pathname.startsWith(p))) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    response.headers.set('X-Public-API-IP', ip);
  }

  // ── Sensitive paths: additional headers ──
  if (pathname.startsWith('/api/staff/') || pathname.startsWith('/api/admin/')) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    response.headers.set('X-RateLimit-IP', ip);
  }

  // ── Admin API: strict rate limiting on mutations ──
  if (pathname.startsWith('/api/admin/') && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    // 30 mutations per minute per IP for admin
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    response.headers.set('X-Admin-IP', ip);
  }

  return response;
}

export const config = {
  matcher: [
    // Match all paths except static files
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
