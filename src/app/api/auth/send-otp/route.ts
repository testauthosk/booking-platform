import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendTelegramMessage } from '@/lib/telegram';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@tholim.com';

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, email, type } = body as {
      phone?: string;
      email?: string;
      type: 'register' | 'login';
    };

    if (!type || (!phone && !email)) {
      return NextResponse.json({ error: 'Необхідно вказати email або телефон' }, { status: 400 });
    }

    // === EMAIL OTP ===
    if (email) {
      const normalizedEmail = email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        return NextResponse.json({ error: 'Невірний формат email' }, { status: 400 });
      }

      // Rate limit: 1 код за 60 сек
      const recentOtp = await prisma.otpCode.findFirst({
        where: {
          email: normalizedEmail,
          createdAt: { gte: new Date(Date.now() - 60 * 1000) },
        },
      });
      if (recentOtp) {
        const waitSec = Math.ceil((recentOtp.createdAt.getTime() + 60000 - Date.now()) / 1000);
        return NextResponse.json({ error: `Зачекайте ${waitSec} сек`, retryAfter: waitSec }, { status: 429 });
      }

      // Check existing user
      const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
      if (type === 'register' && existingUser) {
        return NextResponse.json({ error: 'Користувач з таким email вже існує' }, { status: 400 });
      }
      if (type === 'login' && !existingUser) {
        return NextResponse.json({ error: 'Користувача з таким email не знайдено' }, { status: 400 });
      }

      const code = generateCode();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      // Send email
      let delivered = false;
      if (resend) {
        try {
          await resend.emails.send({
            from: `Tholim <${EMAIL_FROM}>`,
            to: normalizedEmail,
            subject: type === 'register' ? 'Код підтвердження реєстрації' : 'Код для входу',
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 400px; margin: 0 auto; padding: 32px 24px;">
                <h2 style="color: #1a1a1a; font-size: 20px; margin: 0 0 8px;">🔐 Ваш код підтвердження</h2>
                <p style="color: #666; font-size: 14px; margin: 0 0 24px;">
                  ${type === 'register' ? 'Для завершення реєстрації введіть код:' : 'Для входу в акаунт введіть код:'}
                </p>
                <div style="background: #f5f3ff; border: 2px solid #8b5cf6; border-radius: 12px; padding: 20px; text-align: center; margin: 0 0 24px;">
                  <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #7c3aed;">${code}</span>
                </div>
                <p style="color: #999; font-size: 12px; margin: 0;">Код дійсний 5 хвилин. Якщо ви не запитували код — ігноруйте цей лист.</p>
              </div>
            `,
          });
          delivered = true;
        } catch (e) {
          console.error('Resend email error:', e);
        }
      }

      // Save OTP
      await prisma.otpCode.create({
        data: {
          email: normalizedEmail,
          code,
          type: type === 'register' ? 'REGISTER' : 'LOGIN',
          channel: 'EMAIL',
          expiresAt,
          userId: existingUser?.id,
        },
      });

      // Cleanup old
      await prisma.otpCode.deleteMany({
        where: { email: normalizedEmail, expiresAt: { lt: new Date() } },
      });

      return NextResponse.json({
        success: true,
        channel: 'EMAIL',
        delivered,
        expiresIn: 300,
        message: delivered ? 'Код надіслано на email' : 'Не вдалося відправити код',
      });
    }

    // === PHONE OTP ===
    if (!phone) {
      return NextResponse.json({ error: 'Телефон обов\'язковий' }, { status: 400 });
    }

    const normalizedPhone = phone.replace(/[\s\-\(\)]/g, '');
    if (!/^\+380\d{9}$/.test(normalizedPhone)) {
      return NextResponse.json({ error: 'Невірний формат телефону' }, { status: 400 });
    }

    // Rate limit
    const recentOtp = await prisma.otpCode.findFirst({
      where: {
        phone: normalizedPhone,
        createdAt: { gte: new Date(Date.now() - 60 * 1000) },
      },
    });
    if (recentOtp) {
      const waitSec = Math.ceil((recentOtp.createdAt.getTime() + 60000 - Date.now()) / 1000);
      return NextResponse.json({ error: `Зачекайте ${waitSec} сек`, retryAfter: waitSec }, { status: 429 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email: normalizedPhone } });
    if (type === 'register' && existingUser) {
      return NextResponse.json({ error: 'Користувач з таким номером вже існує' }, { status: 400 });
    }
    if (type === 'login' && !existingUser) {
      return NextResponse.json({ error: 'Користувача з таким номером не знайдено' }, { status: 400 });
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    let channel: 'SMS' | 'TELEGRAM' = 'SMS';
    let delivered = false;

    if (type === 'login' && existingUser?.telegramId) {
      channel = 'TELEGRAM';
      const telegramChatId = existingUser.telegramChatId || existingUser.telegramId;
      if (telegramChatId) {
        delivered = await sendTelegramMessage({
          chatId: telegramChatId,
          text: `🔐 <b>Код для входу</b>\n\n<code>${code}</code>\n\nДійсний 5 хвилин. Не повідомляйте нікому.`,
        });
      }
    }

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

    await prisma.otpCode.deleteMany({
      where: { phone: normalizedPhone, expiresAt: { lt: new Date() } },
    });

    const response: Record<string, unknown> = {
      success: true,
      channel,
      expiresIn: 300,
    };

    if (channel === 'SMS') {
      response.message = process.env.TWILIO_ACCOUNT_SID
        ? 'Код надіслано на ваш номер'
        : 'SMS сервіс в розробці. Використовуйте Telegram для входу.';
    } else {
      response.message = delivered ? 'Код надіслано в Telegram' : 'Не вдалося відправити код в Telegram.';
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Send OTP error:', error);
    return NextResponse.json({ error: 'Внутрішня помилка' }, { status: 500 });
  }
}
