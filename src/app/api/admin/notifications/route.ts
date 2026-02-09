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
    const channel = searchParams.get('channel');
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);

    const where: Record<string, unknown> = {};
    if (channel) where.channel = channel;
    if (type) where.type = type;
    if (status) where.status = status;

    const [logs, total] = await Promise.all([
      prisma.notificationLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notificationLog.count({ where }),
    ]);

    // Stats
    const now = new Date();
    const d24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const d7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      total24h, sent24h, failed24h,
      total7d, sent7d, failed7d,
      byChannel, byType,
    ] = await Promise.all([
      prisma.notificationLog.count({ where: { createdAt: { gte: d24h } } }),
      prisma.notificationLog.count({ where: { createdAt: { gte: d24h }, status: 'sent' } }),
      prisma.notificationLog.count({ where: { createdAt: { gte: d24h }, status: 'failed' } }),
      prisma.notificationLog.count({ where: { createdAt: { gte: d7d } } }),
      prisma.notificationLog.count({ where: { createdAt: { gte: d7d }, status: 'sent' } }),
      prisma.notificationLog.count({ where: { createdAt: { gte: d7d }, status: 'failed' } }),
      prisma.notificationLog.groupBy({ by: ['channel'], _count: true, where: { createdAt: { gte: d7d } } }),
      prisma.notificationLog.groupBy({ by: ['type'], _count: true, where: { createdAt: { gte: d7d } } }),
    ]);

    return NextResponse.json({
      logs,
      total,
      page,
      stats: {
        last24h: { total: total24h, sent: sent24h, failed: failed24h },
        last7d: { total: total7d, sent: sent7d, failed: failed7d },
        byChannel: byChannel.map(c => ({ channel: c.channel, count: c._count })),
        byType: byType.map(t => ({ type: t.type, count: t._count })),
      },
    });
  } catch (error) {
    console.error('Notifications error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
