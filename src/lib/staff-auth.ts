import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { createHash } from 'crypto';
import { checkRateLimit } from '@/lib/rate-limit';

const JWT_SECRET_RAW = process.env.JWT_SECRET;
if (!JWT_SECRET_RAW && process.env.NODE_ENV === 'production') {
  console.error('⚠️ CRITICAL: JWT_SECRET not set in production!');
}
const JWT_SECRET = new TextEncoder().encode(
  JWT_SECRET_RAW || 'staff-secret-key-change-in-production'
);

// ── isActive cache (5 min TTL) ──
const activeCache = new Map<string, { active: boolean; expiresAt: number }>();
const ACTIVE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function checkMasterActive(masterId: string): Promise<boolean> {
  const now = Date.now();
  const cached = activeCache.get(masterId);
  if (cached && cached.expiresAt > now) {
    return cached.active;
  }
  // Dynamic import to avoid circular dependency
  const { default: prisma } = await import('@/lib/prisma');
  const master = await prisma.master.findUnique({
    where: { id: masterId },
    select: { isActive: true },
  });
  const active = master?.isActive ?? false;
  activeCache.set(masterId, { active, expiresAt: now + ACTIVE_CACHE_TTL });
  return active;
}

/** Force-evict a master from the active cache (call on deactivation) */
export function evictActiveCache(masterId: string): void {
  activeCache.delete(masterId);
}

interface StaffTokenPayload {
  masterId: string;
  salonId: string;
  email: string;
  type: 'staff';
}

/**
 * Верифікує JWT токен мастера з Authorization header.
 * Повертає payload або NextResponse з помилкою.
 */
export async function verifyStaffToken(
  request: NextRequest
): Promise<StaffTokenPayload | NextResponse> {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);

    if (payload.type !== 'staff' || !payload.masterId) {
      return NextResponse.json({ error: 'Invalid token type' }, { status: 401 });
    }

    // IP fingerprint check — log mismatch for anomaly detection
    const currentIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const currentIpHash = createHash('sha256').update(currentIp).digest('hex').slice(0, 16);
    if (payload.ipHash && payload.ipHash !== currentIpHash) {
      console.warn(`[STAFF_AUTH] IP mismatch for master ${payload.masterId}: token=${payload.ipHash} current=${currentIpHash} ip=${currentIp}`);
    }

    // Check if master is still active (cached 5 min to avoid DB hit every request)
    const masterId = payload.masterId as string;
    const isActive = await checkMasterActive(masterId);
    if (!isActive) {
      return NextResponse.json({ error: 'Акаунт деактивовано' }, { status: 403 });
    }

    return {
      masterId,
      salonId: payload.salonId as string,
      email: payload.email as string,
      type: 'staff',
    };
  } catch {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }
}

/**
 * Rate-limit check for staff API write operations.
 * Returns NextResponse 429 if exceeded, null if OK.
 * 60 write requests per minute per master.
 */
export function staffWriteRateLimit(request: NextRequest, masterId: string): NextResponse | null {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const key = `staff-write:${masterId}:${ip}`;
  const check = checkRateLimit(key, { maxAttempts: 60, windowMs: 60_000 });
  if (!check.allowed) {
    return NextResponse.json(
      { error: `Забагато запитів. Спробуйте через ${check.resetIn} сек` },
      { status: 429 }
    );
  }
  return null;
}

/**
 * Перевіряє що запитуваний masterId === токенний masterId.
 * Запобігає доступу до чужих даних.
 */
export function assertOwnMaster(
  tokenPayload: StaffTokenPayload,
  requestedMasterId: string | null
): NextResponse | null {
  if (!requestedMasterId) {
    return NextResponse.json({ error: 'masterId required' }, { status: 400 });
  }

  if (tokenPayload.masterId !== requestedMasterId) {
    return NextResponse.json({ error: 'Forbidden — не ваш профіль' }, { status: 403 });
  }

  return null; // ok
}

/**
 * Перевіряє що запитуваний masterId належить до того ж салону.
 * Для операцій з колегами (перегляд розкладу, створення запису для колеги).
 */
export async function assertSameSalonMaster(
  tokenPayload: StaffTokenPayload,
  requestedMasterId: string | null
): Promise<NextResponse | null> {
  if (!requestedMasterId) {
    return NextResponse.json({ error: 'masterId required' }, { status: 400 });
  }

  // Якщо це свій ID — одразу ОК
  if (tokenPayload.masterId === requestedMasterId) {
    return null;
  }

  // Перевіряємо що колега з того ж салону
  const { prisma } = await import('@/lib/prisma');
  const colleague = await prisma.master.findUnique({
    where: { id: requestedMasterId },
    select: { salonId: true },
  });

  if (!colleague || colleague.salonId !== tokenPayload.salonId) {
    return NextResponse.json({ error: 'Forbidden — мастер з іншого салону' }, { status: 403 });
  }

  return null; // ok — колега з того ж салону
}
