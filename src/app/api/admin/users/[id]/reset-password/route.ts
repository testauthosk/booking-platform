import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// Telegram bot token for sending new password
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function sendTelegramMessage(chatId: string, text: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) return false;
  
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function sendEmail(to: string, subject: string, text: string): Promise<boolean> {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) return false;
  
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'noreply@booking.com',
        to,
        subject,
        text,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// POST - reset password and send to user
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const { sendVia } = await req.json(); // 'email' | 'telegram' | 'both' | 'none'

    // Get user
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        telegramChatId: true,
        salonId: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Generate new password
    const newPassword = crypto.randomBytes(4).toString('hex'); // 8 chars
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    // Send password to user
    let emailSent = false;
    let telegramSent = false;

    const message = `🔐 Ваш новий пароль: <b>${newPassword}</b>\n\nБудь ласка, змініть його після входу в систему.`;
    const subject = 'Новий пароль для входу';

    if (sendVia === 'email' || sendVia === 'both') {
      if (user.email) {
        emailSent = await sendEmail(user.email, subject, message.replace(/<[^>]*>/g, ''));
      }
    }

    if (sendVia === 'telegram' || sendVia === 'both') {
      if (user.telegramChatId) {
        telegramSent = await sendTelegramMessage(user.telegramChatId, message);
      }
    }

    // Log the action
    await prisma.auditLog.create({
      data: {
        salonId: user.salonId || 'system',
        actorType: 'ADMIN',
        actorId: session.user.id,
        actorName: session.user.email || 'Super Admin',
        action: 'UPDATE',
        entityType: 'USER',
        entityId: id,
        entityName: user.name || user.email,
        changes: { action: 'password_reset', emailSent, telegramSent },
      },
    });

    return NextResponse.json({
      success: true,
      newPassword: sendVia === 'none' ? newPassword : undefined,
      emailSent,
      telegramSent,
      message: sendVia === 'none' 
        ? `Новий пароль: ${newPassword}` 
        : `Пароль скинуто${emailSent ? ', відправлено на email' : ''}${telegramSent ? ', відправлено в Telegram' : ''}`,
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
