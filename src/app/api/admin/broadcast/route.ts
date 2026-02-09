import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/prisma';

// Telegram bot token
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
  // Check if Resend is configured
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

// GET - get audience stats for preview
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const audience = searchParams.get('audience'); // all_owners | all_telegram | salon
    const channel = searchParams.get('channel'); // telegram | email
    const salonId = searchParams.get('salonId');

    let count = 0;
    let recipients: Array<{ id: string; name: string | null; email: string | null; telegramChatId: string | null }> = [];

    if (audience === 'all_owners') {
      const where: Record<string, unknown> = { role: 'SALON_OWNER' };
      if (channel === 'telegram') {
        where.telegramChatId = { not: null };
      } else if (channel === 'email') {
        where.email = { not: null };
      }
      
      const users = await prisma.user.findMany({
        where,
        select: { id: true, name: true, email: true, telegramChatId: true },
      });
      count = users.length;
      recipients = users;
    } else if (audience === 'all_telegram') {
      // All users with telegram
      const users = await prisma.user.findMany({
        where: { telegramChatId: { not: null } },
        select: { id: true, name: true, email: true, telegramChatId: true },
      });
      count = users.length;
      recipients = users;
    } else if (audience === 'salon' && salonId) {
      // Clients of specific salon
      const where: Record<string, unknown> = { salonId };
      if (channel === 'telegram') {
        where.telegramChatId = { not: null };
      } else if (channel === 'email') {
        where.email = { not: null };
      }
      
      const clients = await prisma.client.findMany({
        where,
        select: { id: true, name: true, email: true, telegramChatId: true },
      });
      count = clients.length;
      recipients = clients;
    }

    return NextResponse.json({
      count,
      recipients: recipients.slice(0, 10), // Preview first 10
      hasMore: count > 10,
    });
  } catch (error) {
    console.error('Error getting audience:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// POST - send broadcast message
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { message, subject, audience, channel, salonId } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    if (!channel || !['telegram', 'email'].includes(channel)) {
      return NextResponse.json({ error: 'Invalid channel' }, { status: 400 });
    }

    // Get recipients
    let recipients: Array<{ id: string; email: string | null; telegramChatId: string | null }> = [];

    if (audience === 'all_owners') {
      const where: Record<string, unknown> = { role: 'SALON_OWNER' };
      if (channel === 'telegram') {
        where.telegramChatId = { not: null };
      } else if (channel === 'email') {
        where.email = { not: null };
      }
      
      recipients = await prisma.user.findMany({
        where,
        select: { id: true, email: true, telegramChatId: true },
      });
    } else if (audience === 'all_telegram') {
      recipients = await prisma.user.findMany({
        where: { telegramChatId: { not: null } },
        select: { id: true, email: true, telegramChatId: true },
      });
    } else if (audience === 'salon' && salonId) {
      const where: Record<string, unknown> = { salonId };
      if (channel === 'telegram') {
        where.telegramChatId = { not: null };
      } else if (channel === 'email') {
        where.email = { not: null };
      }
      
      recipients = await prisma.client.findMany({
        where,
        select: { id: true, email: true, telegramChatId: true },
      });
    }

    if (recipients.length === 0) {
      return NextResponse.json({ error: 'No recipients found' }, { status: 400 });
    }

    // Send messages
    let sent = 0;
    let failed = 0;

    for (const recipient of recipients) {
      let success = false;

      if (channel === 'telegram' && recipient.telegramChatId) {
        success = await sendTelegramMessage(recipient.telegramChatId, message);
      } else if (channel === 'email' && recipient.email) {
        success = await sendEmail(recipient.email, subject || 'Повідомлення від адміністрації', message);
      }

      if (success) {
        sent++;
      } else {
        failed++;
      }

      // Rate limiting: 30 messages per second for Telegram
      if (channel === 'telegram') {
        await new Promise((resolve) => setTimeout(resolve, 35));
      }
    }

    // Log the broadcast
    await prisma.auditLog.create({
      data: {
        salonId: salonId || 'system',
        actorType: 'ADMIN',
        actorId: session.user.id,
        actorName: session.user.email || 'Super Admin',
        action: 'CREATE',
        entityType: 'BROADCAST',
        entityName: `${channel} to ${audience}`,
        changes: {
          message,
          audience,
          channel,
          salonId,
          sent,
          failed,
          total: recipients.length,
        },
      },
    });

    return NextResponse.json({
      success: true,
      sent,
      failed,
      total: recipients.length,
    });
  } catch (error) {
    console.error('Error sending broadcast:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
