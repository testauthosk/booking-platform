import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { createHash } from 'crypto';
import { checkRateLimit, resetRateLimit } from '@/lib/rate-limit';
import { createAndSendOtp } from '@/lib/staff-otp';

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

function parseDeviceLabel(ua: string): string {
  if (!ua) return 'Невідомий пристрій';
  if (/iPhone/.test(ua)) return 'Safari on iPhone';
  if (/iPad/.test(ua)) return 'Safari on iPad';
  if (/Android/.test(ua)) {
    if (/Chrome/.test(ua)) return 'Chrome on Android';
    if (/Firefox/.test(ua)) return 'Firefox on Android';
    return 'Browser on Android';
  }
  if (/Macintosh/.test(ua)) {
    if (/Chrome/.test(ua)) return 'Chrome on Mac';
    if (/Safari/.test(ua)) return 'Safari on Mac';
    if (/Firefox/.test(ua)) return 'Firefox on Mac';
    return 'Browser on Mac';
  }
  if (/Windows/.test(ua)) {
    if (/Chrome/.test(ua)) return 'Chrome on Windows';
    if (/Firefox/.test(ua)) return 'Firefox on Windows';
    if (/Edge/.test(ua)) return 'Edge on Windows';
    return 'Browser on Windows';
  }
  if (/Linux/.test(ua)) return 'Browser on Linux';
  return 'Невідомий пристрій';
}

const LOGIN_RATE_LIMIT = { maxAttempts: 5, windowMs: 15 * 60 * 1000 };

// POST /api/staff/login
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email та пароль обовʼязкові' }, { status: 400 });
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rateLimitKey = `staff-login:${ip}:${email.toLowerCase()}`;
    const rateCheck = checkRateLimit(rateLimitKey, LOGIN_RATE_LIMIT);

    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Забагато спроб. Спробуйте через ${Math.ceil(rateCheck.resetIn / 60)} хв` },
        { status: 429 }
      );
    }

    // Find master
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
      return NextResponse.json({ error: 'Невірний email або пароль' }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, master.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: 'Невірний email або пароль' }, { status: 401 });
    }

    // Password OK — check device
    const deviceFingerprint = body.deviceFingerprint || request.headers.get('user-agent') || 'unknown';
    const fpHash = hashString(deviceFingerprint);

    const trustedDevice = await prisma.trustedDevice.findUnique({
      where: { masterId_fingerprint: { masterId: master.id, fingerprint: fpHash } },
    });

    // ── Trusted device → issue token immediately ──
    if (trustedDevice) {
      // Update last used
      await prisma.trustedDevice.update({
        where: { id: trustedDevice.id },
        data: { lastUsedAt: new Date(), ip: ip.trim() },
      });

      await prisma.master.update({
        where: { id: master.id },
        data: { lastLogin: new Date() },
      });

      resetRateLimit(rateLimitKey);

      const token = await createStaffToken(master, ip, fpHash, '30d');

      return NextResponse.json({
        token,
        master: masterResponse(master),
        trustedDevice: true,
      });
    }

    // ── New device → auto-trust and issue token (OTP disabled for now) ──
    // Auto-register as trusted device
    try {
      await prisma.trustedDevice.create({
        data: {
          masterId: master.id,
          fingerprint: fpHash,
          label: parseDeviceLabel(request.headers.get('user-agent') || ''),
          ip: ip.trim(),
          lastUsedAt: new Date(),
        },
      });
    } catch {
      // Ignore if already exists (race condition)
    }

    await prisma.master.update({
      where: { id: master.id },
      data: { lastLogin: new Date() },
    });

    resetRateLimit(rateLimitKey);

    const token = await createStaffToken(master, ip, fpHash, '7d');

    return NextResponse.json({
      token,
      master: masterResponse(master),
      trustedDevice: false, // first time, shorter token
    });
  } catch (error) {
    console.error('POST /api/staff/login error:', error);
    return NextResponse.json({ error: 'Помилка сервера' }, { status: 500 });
  }
}

// ── Helpers ──

async function createStaffToken(
  master: { id: string; salonId: string; email: string | null },
  ip: string,
  fp: string,
  ttl: string
): Promise<string> {
  return new SignJWT({
    masterId: master.id,
    salonId: master.salonId,
    email: master.email,
    type: 'staff',
    ipHash: hashString(ip),
    fp,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(ttl)
    .sign(JWT_SECRET);
}

function masterResponse(master: {
  id: string;
  name: string;
  email: string | null;
  role: string | null;
  avatar: string | null;
  salonId: string;
}) {
  return {
    id: master.id,
    name: master.name,
    email: master.email,
    role: master.role,
    avatar: master.avatar,
    salonId: master.salonId,
  };
}
