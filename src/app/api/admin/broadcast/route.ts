import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { sendTelegramMessage } from '@/lib/telegram';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@tholim.com';

function buildWhere(audience: string, channel: string, salonId?: string | null) {
  const where: Record<string, unknown> = {};

  if (audience === 'all_owners') {
    where.role = 'SALON_OWNER';
  } else if (audience === 'all_telegram') {
    where.role = 'SALON_OWNER';
    where.telegramChatId = { not: null };
  } else if (audience === 'all_masters') {
    // Masters are in separate table — handle differently
  } else if (audience === 'salon' && salonId) {
    where.salonId = salonId;
  }

  // Channel filtering
  if (channel === 'telegram') {
    where.telegramChatId = { not: null };
  }

  return where;
}

// GET — preview recipients
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const audience = searchParams.get('audience') || 'all_owners';
    const channel = searchParams.get('channel') || 'telegram';
    const salonId = searchParams.get('salonId');

    const where = buildWhere(audience, channel, salonId);

    const [recipients, count] = await Promise.all([
      prisma.user.findMany({
        where,
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: { id: true, email: true, name: true, telegramChatId: true, role: true },
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      count,
      recipients: recipients.map(r => ({
        id: r.id,
        email: r.email,
        name: r.name,
        hasTelegram: !!r.telegramChatId,
        role: r.role,
      })),
      hasMore: count > 10,
    });
  } catch (error) {
    console.error('Broadcast preview error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// POST — send broadcast
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message, channel, audience, salonId } = await request.json();

    if (!message || !channel || !audience) {
      return NextResponse.json({ error: 'message, channel, audience required' }, { status: 400 });
    }

    const where = buildWhere(audience, channel, salonId);
    const recipients = await prisma.user.findMany({
      where,
      select: { id: true, email: true, name: true, telegramChatId: true },
    });

    if (recipients.length === 0) {
      return NextResponse.json({ error: 'Немає отримувачів' }, { status: 400 });
    }

    let sent = 0;
    let failed = 0;

    if (channel === 'telegram') {
      for (const r of recipients) {
        if (!r.telegramChatId) { failed++; continue; }
        try {
          const ok = await sendTelegramMessage({ chatId: r.telegramChatId, text: message });
          if (ok) sent++; else failed++;
        } catch { failed++; }
      }
    } else if (channel === 'email' && resend) {
      for (const r of recipients) {
        if (!r.email) { failed++; continue; }
        try {
          await resend.emails.send({
            from: `Tholim <${EMAIL_FROM}>`,
            to: r.email,
            subject: 'Повідомлення від Tholim',
            html: `<div style="font-family: sans-serif; padding: 24px; max-width: 600px; margin: auto;">${message.replace(/\n/g, '<br>')}</div>`,
          });
          sent++;
        } catch { failed++; }
      }
    } else {
      return NextResponse.json({ error: 'Invalid channel or missing config' }, { status: 400 });
    }

    // Log the broadcast
    try {
      await prisma.auditLog.create({
        data: {
          salonId: 'system',
          actorType: 'ADMIN',
          actorId: session.user.id,
          actorName: session.user.email || 'Super Admin',
          action: 'CREATE',
          entityType: 'BROADCAST',
          entityId: `${channel}-${audience}`,
          changes: { message: message.substring(0, 200), sent, failed, total: recipients.length },
        },
      });
    } catch {}

    return NextResponse.json({ sent, failed, total: recipients.length });
  } catch (error) {
    console.error('Broadcast error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
