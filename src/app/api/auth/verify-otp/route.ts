import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { phone, email, code } = await request.json() as { phone?: string; email?: string; code: string };

    if (!code || (!phone && !email)) {
      return NextResponse.json({ error: 'Код та email/телефон обов\'язкові' }, { status: 400 });
    }

    // Build query
    const identifier = email
      ? { email: email.trim().toLowerCase() }
      : { phone: phone!.replace(/[\s\-\(\)]/g, '') };

    // Find valid OTP
    const otp = await prisma.otpCode.findFirst({
      where: {
        ...identifier,
        verified: false,
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) {
      return NextResponse.json(
        { error: 'Код не знайдено або термін дії закінчився' },
        { status: 400 }
      );
    }

    // Check attempts
    if (otp.attempts >= 5) {
      await prisma.otpCode.delete({ where: { id: otp.id } });
      return NextResponse.json(
        { error: 'Забагато спроб. Запитайте новий код.' },
        { status: 400 }
      );
    }

    // Increment attempts
    await prisma.otpCode.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });

    // Verify code
    if (otp.code !== code) {
      const remaining = 4 - otp.attempts;
      return NextResponse.json(
        { error: `Невірний код`, remainingAttempts: remaining },
        { status: 400 }
      );
    }

    // Mark as verified
    await prisma.otpCode.update({
      where: { id: otp.id },
      data: { verified: true },
    });

    return NextResponse.json({
      success: true,
      verified: true,
      type: otp.type,
      userId: otp.userId,
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return NextResponse.json({ error: 'Внутрішня помилка' }, { status: 500 });
  }
}
