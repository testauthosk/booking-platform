import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { createHash } from 'crypto';
import { checkRateLimit, resetRateLimit } from '@/lib/rate-limit';

// Simple hash for IP fingerprinting (not security-critical, just binding)
function hashString(input: string): string {
  return createHash('sha256').update(input).digest('hex').slice(0, 16);
}

const JWT_SECRET_RAW = process.env.JWT_SECRET;
if (!JWT_SECRET_RAW && process.env.NODE_ENV === 'production') {
  console.error('⚠️ CRITICAL: JWT_SECRET not set in production!');
}
const JWT_SECRET = new TextEncoder().encode(
  JWT_SECRET_RAW || 'staff-secret-key-change-in-production'
);

// Rate limit: 5 attempts per 15 minutes per IP+email
const RATE_LIMIT = { maxAttempts: 5, windowMs: 15 * 60 * 1000 };

// POST /api/staff/login - авторизация мастера
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    // Rate limiting by IP + email
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const rateLimitKey = `staff-login:${ip}:${email.toLowerCase()}`;
    const rateCheck = checkRateLimit(rateLimitKey, RATE_LIMIT);

    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Забагато спроб. Спробуйте через ${Math.ceil(rateCheck.resetIn / 60)} хв` },
        { status: 429 }
      );
    }

    // Находим мастера — select only needed fields
    const master = await prisma.master.findFirst({
      where: { email: email.toLowerCase().trim(), isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        salonId: true,
        passwordHash: true,
      }
    });

    if (!master || !master.passwordHash) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Проверяем пароль
    const valid = await bcrypt.compare(password, master.passwordHash);

    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Обновляем lastLogin
    await prisma.master.update({
      where: { id: master.id },
      data: { lastLogin: new Date() },
    });

    // Reset rate limit on success
    resetRateLimit(rateLimitKey);

    // IP fingerprint for token binding (reuse ip from rate limit)

    // Создаём JWT токен with IP fingerprint
    const token = await new SignJWT({
      masterId: master.id,
      salonId: master.salonId,
      email: master.email,
      type: 'staff',
      ipHash: hashString(ip), // Loose binding — logged for anomaly detection
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d')
      .sign(JWT_SECRET);

    return NextResponse.json({
      token,
      master: {
        id: master.id,
        name: master.name,
        email: master.email,
        role: master.role,
        avatar: master.avatar,
        salonId: master.salonId,
      },
    });
  } catch (error) {
    console.error('POST /api/staff/login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
