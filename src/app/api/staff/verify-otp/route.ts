import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SignJWT, jwtVerify } from 'jose';
import { createHash } from 'crypto';
import { checkRateLimit } from '@/lib/rate-limit';
import { verifyOtp } from '@/lib/staff-otp';

function hashString(input: string): string {
  return createHash('sha256').update(input).digest('hex').slice(0, 16);
}

const JWT_SECRET_RAW = process.env.JWT_SECRET;
const JWT_SECRET = new TextEncoder().encode(
  JWT_SECRET_RAW || 'staff-secret-key-change-in-production'
);

function parseDeviceLabel(ua: string): string {
  if (!ua) return 'Невідомий пристрій';
  if (/iPhone/.test(ua)) return 'Safari on iPhone';
  if (/iPad/.test(ua)) return 'Safari on iPad';
  if (/Android/.test(ua)) {
    if (/Chrome/.test(ua)) return 'Chrome on Android';
    return 'Browser on Android';
  }
  if (/Macintosh/.test(ua)) {
    if (/Chrome/.test(ua)) return 'Chrome on Mac';
    if (/Safari/.test(ua)) return 'Safari on Mac';
    return 'Browser on Mac';
  }
  if (/Windows/.test(ua)) {
    if (/Chrome/.test(ua)) return 'Chrome on Windows';
    if (/Edge/.test(ua)) return 'Edge on Windows';
    return 'Browser on Windows';
  }
  return 'Невідомий пристрій';
}

// POST /api/staff/verify-otp
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pendingToken, code } = body;

    if (!pendingToken || !code) {
      return NextResponse.json({ error: 'Токен та код обовʼязкові' }, { status: 400 });
    }

    // Rate limit OTP verification
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rlKey = `otp-verify:${ip}`;
    const rlCheck = checkRateLimit(rlKey, { maxAttempts: 10, windowMs: 15 * 60 * 1000 });
    if (!rlCheck.allowed) {
      return NextResponse.json(
        { error: `Забагато спроб. Спробуйте через ${Math.ceil(rlCheck.resetIn / 60)} хв` },
        { status: 429 }
      );
    }

    // Verify pending token
    let payload;
    try {
      const result = await jwtVerify(pendingToken, JWT_SECRET);
      payload = result.payload;
    } catch {
      return NextResponse.json({ error: 'Сесія підтвердження закінчилась. Увійдіть знову' }, { status: 401 });
    }

    if (payload.type !== 'pending-otp' || !payload.masterId) {
      return NextResponse.json({ error: 'Невалідний токен' }, { status: 401 });
    }

    const masterId = payload.masterId as string;
    const fp = payload.fp as string;

    // Verify OTP code
    const otpResult = await verifyOtp(masterId, code.trim());
    if (!otpResult.valid) {
      return NextResponse.json({ error: otpResult.error }, { status: 400 });
    }

    // OTP valid — register trusted device and issue token
    const master = await prisma.master.findUnique({
      where: { id: masterId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        salonId: true,
        isActive: true,
      },
    });

    if (!master || !master.isActive) {
      return NextResponse.json({ error: 'Акаунт деактивовано' }, { status: 403 });
    }

    // Save trusted device
    await prisma.trustedDevice.upsert({
      where: { masterId_fingerprint: { masterId, fingerprint: fp } },
      update: { lastUsedAt: new Date(), ip: ip.trim() },
      create: {
        masterId,
        fingerprint: fp,
        label: parseDeviceLabel(request.headers.get('user-agent') || ''),
        ip: ip.trim(),
      },
    });

    // Update lastLogin
    await prisma.master.update({
      where: { id: masterId },
      data: { lastLogin: new Date() },
    });

    // Issue full token (30d — device is now trusted)
    const token = await new SignJWT({
      masterId: master.id,
      salonId: master.salonId,
      email: master.email,
      type: 'staff',
      ipHash: hashString(ip),
      fp,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('30d')
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
      trustedDevice: true,
    });
  } catch (error) {
    console.error('POST /api/staff/verify-otp error:', error);
    return NextResponse.json({ error: 'Помилка сервера' }, { status: 500 });
  }
}
