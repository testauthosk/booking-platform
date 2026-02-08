import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendTelegramMessage } from '@/lib/telegram';

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: NextRequest) {
  try {
    const { phone, type } = await request.json() as {
      phone: string;
      type: 'register' | 'login';
    };

    if (!phone || !type) {
      return NextResponse.json({ error: 'Телефон та тип обов\'язкові' }, { status: 400 });
    }

    // Нормалізуємо телефон
    const normalizedPhone = phone.replace(/[\s\-\(\)]/g, '');
    if (!/^\+380\d{9}$/.test(normalizedPhone)) {
      return NextResponse.json({ error: 'Невірний формат телефону' }, { status: 400 });
    }

    // Rate limit: не більше 1 коду за 60 сек
    const recentOtp = await prisma.otpCode.findFirst({
      where: {
        phone: normalizedPhone,
        createdAt: { gte: new Date(Date.now() - 60 * 1000) },
      },
    });

    if (recentOtp) {
      const waitSec = Math.ceil((recentOtp.createdAt.getTime() + 60000 - Date.now()) / 1000);
      return NextResponse.json(
        { error: `Зачекайте ${waitSec} сек`, retryAfter: waitSec },
        { status: 429 }
      );
    }

    // Перевірки залежно від типу
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedPhone },
    });

    if (type === 'register' && existingUser) {
      return NextResponse.json(
        { error: 'Користувач з таким номером вже існує' },
        { status: 400 }
      );
    }

    if (type === 'login' && !existingUser) {
      return NextResponse.json(
        { error: 'Користувача з таким номером не знайдено' },
        { status: 400 }
      );
    }

    // Генеруємо код
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 хвилин

    // Визначаємо канал доставки
    let channel: 'SMS' | 'TELEGRAM' = 'SMS';
    let delivered = false;

    if (type === 'login' && existingUser?.telegramId) {
      // Відправляємо через Telegram
      channel = 'TELEGRAM';
      const telegramChatId = existingUser.telegramChatId || existingUser.telegramId;

      if (telegramChatId) {
        delivered = await sendTelegramMessage({
          chatId: telegramChatId,
          text: `🔐 <b>Код для входу</b>\n\n<code>${code}</code>\n\nДійсний 5 хвилин. Не повідомляйте нікому.`,
        });
      }
    }

    // Зберігаємо OTP
    await prisma.otpCode.create({
      data: {
        phone: normalizedPhone,
        code,
        type: type === 'register' ? 'REGISTER' : 'LOGIN',
        channel,
        expiresAt,
        userId: existingUser?.id,
      },
    });

    // Очищаємо старі коди цього телефону
    await prisma.otpCode.deleteMany({
      where: {
        phone: normalizedPhone,
        expiresAt: { lt: new Date() },
      },
    });

    const response: Record<string, unknown> = {
      success: true,
      channel,
      expiresIn: 300, // 5 хвилин в секундах
    };

    // SMS поки не реалізовано — повертаємо код в dev mode
    if (channel === 'SMS') {
      if (process.env.NODE_ENV !== 'production' || !process.env.TWILIO_ACCOUNT_SID) {
        response.devCode = code; // Тільки для розробки!
        response.message = 'SMS не налаштовано. Код для тестування в devCode.';
      } else {
        // TODO: Twilio SMS
        response.message = 'Код надіслано на ваш номер';
      }
    } else if (channel === 'TELEGRAM') {
      response.message = delivered
        ? 'Код надіслано в Telegram'
        : 'Не вдалося відправити код в Telegram. Спробуйте пізніше.';
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Send OTP error:', error);
    return NextResponse.json({ error: 'Внутрішня помилка' }, { status: 500 });
  }
}
