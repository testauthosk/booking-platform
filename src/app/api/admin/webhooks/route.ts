import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const service = searchParams.get('service');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);

    const where: Record<string, unknown> = {};
    if (service) where.service = service;

    const [logs, total] = await Promise.all([
      prisma.webhookLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.webhookLog.count({ where }),
    ]);

    // Telegram webhook status
    const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
    let telegramWebhook = null;
    if (telegramToken) {
      try {
        const res = await fetch(`https://api.telegram.org/bot${telegramToken}/getWebhookInfo`);
        const data = await res.json();
        if (data.ok) {
          telegramWebhook = {
            url: data.result.url,
            pendingUpdateCount: data.result.pending_update_count,
            lastErrorDate: data.result.last_error_date ? new Date(data.result.last_error_date * 1000).toISOString() : null,
            lastErrorMessage: data.result.last_error_message,
            maxConnections: data.result.max_connections,
          };
        }
      } catch {}
    }

    // Stats
    const now = new Date();
    const d24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const [total24h, errors24h, serviceStats] = await Promise.all([
      prisma.webhookLog.count({ where: { createdAt: { gte: d24h } } }),
      prisma.webhookLog.count({ where: { createdAt: { gte: d24h }, error: { not: null } } }),
      prisma.webhookLog.groupBy({
        by: ['service'],
        _count: true,
        where: { createdAt: { gte: d24h } },
      }),
    ]);

    return NextResponse.json({
      logs,
      total,
      page,
      telegramWebhook,
      stats: {
        total24h,
        errors24h,
        byService: serviceStats.map(s => ({ service: s.service, count: s._count })),
      },
    });
  } catch (error) {
    console.error('Webhooks error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
