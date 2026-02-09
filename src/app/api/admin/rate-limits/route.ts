import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = new Date();
    const d1h = new Date(now.getTime() - 60 * 60 * 1000);
    const d24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Audit log activity as proxy for API usage
    const [
      actionsLast1h,
      actionsLast24h,
      topActors1h,
      topSalons24h,
      actionBreakdown24h,
    ] = await Promise.all([
      prisma.auditLog.count({ where: { createdAt: { gte: d1h } } }),
      prisma.auditLog.count({ where: { createdAt: { gte: d24h } } }),
      prisma.auditLog.groupBy({
        by: ['actorName'],
        where: { createdAt: { gte: d1h } },
        _count: true,
        orderBy: { _count: { actorName: 'desc' } },
        take: 10,
      }),
      prisma.auditLog.groupBy({
        by: ['salonId'],
        where: { createdAt: { gte: d24h } },
        _count: true,
        orderBy: { _count: { salonId: 'desc' } },
        take: 10,
      }),
      prisma.auditLog.groupBy({
        by: ['action'],
        where: { createdAt: { gte: d24h } },
        _count: true,
      }),
    ]);

    // OTP attempts as rate limit indicator
    const [otpAttempts1h, failedOtps] = await Promise.all([
      prisma.otpCode.count({ where: { createdAt: { gte: d1h } } }),
      prisma.otpCode.count({ where: { createdAt: { gte: d24h }, verified: false, attempts: { gte: 3 } } }),
    ]);

    // Booking creation rate
    const bookingsCreated24h = await prisma.booking.count({
      where: { createdAt: { gte: d24h } },
    });

    // Salon names for top salons
    const salonIds = topSalons24h.map(s => s.salonId);
    const salons = salonIds.length > 0
      ? await prisma.salon.findMany({
          where: { id: { in: salonIds } },
          select: { id: true, name: true },
        })
      : [];
    const salonMap = new Map(salons.map(s => [s.id, s.name]));

    return NextResponse.json({
      summary: {
        actionsLast1h,
        actionsLast24h,
        otpAttempts1h,
        failedOtps,
        bookingsCreated24h,
        avgPerHour: Math.round(actionsLast24h / 24),
      },
      topActors: topActors1h.map(a => ({ name: a.actorName, count: a._count })),
      topSalons: topSalons24h.map(s => ({
        salonId: s.salonId,
        salonName: salonMap.get(s.salonId) || s.salonId,
        count: s._count,
      })),
      actionBreakdown: actionBreakdown24h.map(a => ({ action: a.action, count: a._count })),
    });
  } catch (error) {
    console.error('Rate limits error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
