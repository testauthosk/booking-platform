import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { phone, code } = await request.json() as { phone: string; code: string };

    if (!phone || !code) {
      return NextResponse.json({ error: 'Телефон та код обов\'язкові' }, { status: 400 });
    }

    const normalizedPhone = phone.replace(/[\s\-\(\)]/g, '');

    // Шукаємо актуальний OTP
    const otp = await prisma.otpCode.findFirst({
      where: {
        phone: normalizedPhone,
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

    // Перевіряємо кількість спроб
    if (otp.attempts >= 5) {
      await prisma.otpCode.delete({ where: { id: otp.id } });
      return NextResponse.json(
        { error: 'Забагато спроб. Запитайте новий код.' },
        { status: 400 }
      );
    }

    // Збільшуємо лічильник спроб
    await prisma.otpCode.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });

    // Перевіряємо код
    if (otp.code !== code) {
      const remaining = 4 - otp.attempts;
      return NextResponse.json(
        { error: `Невірний код. Залишилось спроб: ${remaining}` },
        { status: 400 }
      );
    }

    // Код вірний — позначаємо verified
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
