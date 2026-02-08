import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'staff-secret-key-change-in-production'
);

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

    return {
      masterId: payload.masterId as string,
      salonId: payload.salonId as string,
      email: payload.email as string,
      type: 'staff',
    };
  } catch {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }
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
