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

    // --- Retention cohorts by registration month ---
    const salons = await prisma.salon.findMany({
      select: {
        id: true, name: true, slug: true, createdAt: true, isActive: true,
        _count: { select: { bookings: true } },
      },
    });

    // Group by registration month
    const cohortMap = new Map<string, { registered: number; active30: number; active60: number; active90: number; churned: number }>();

    const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const d60 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const d90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // Get booking activity per salon
    const [bookingsLast30, bookingsLast60, bookingsLast90] = await Promise.all([
      prisma.booking.groupBy({ by: ['salonId'], where: { createdAt: { gte: d30 } }, _count: true }),
      prisma.booking.groupBy({ by: ['salonId'], where: { createdAt: { gte: d60 } }, _count: true }),
      prisma.booking.groupBy({ by: ['salonId'], where: { createdAt: { gte: d90 } }, _count: true }),
    ]);

    const b30Set = new Set(bookingsLast30.filter(b => b._count > 0).map(b => b.salonId));
    const b60Set = new Set(bookingsLast60.filter(b => b._count > 0).map(b => b.salonId));
    const b90Set = new Set(bookingsLast90.filter(b => b._count > 0).map(b => b.salonId));

    for (const salon of salons) {
      const month = `${salon.createdAt.getFullYear()}-${String(salon.createdAt.getMonth() + 1).padStart(2, '0')}`;
      if (!cohortMap.has(month)) {
        cohortMap.set(month, { registered: 0, active30: 0, active60: 0, active90: 0, churned: 0 });
      }
      const cohort = cohortMap.get(month)!;
      cohort.registered++;
      if (b30Set.has(salon.id)) cohort.active30++;
      if (b60Set.has(salon.id)) cohort.active60++;
      if (b90Set.has(salon.id)) cohort.active90++;
      if (salon._count.bookings > 0 && !b90Set.has(salon.id)) cohort.churned++;
    }

    const cohorts = Array.from(cohortMap.entries())
      .map(([month, data]) => ({
        month,
        ...data,
        retention30: data.registered > 0 ? Math.round((data.active30 / data.registered) * 100) : 0,
        retention60: data.registered > 0 ? Math.round((data.active60 / data.registered) * 100) : 0,
        retention90: data.registered > 0 ? Math.round((data.active90 / data.registered) * 100) : 0,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // --- At-risk salons (had bookings before, none in 30 days) ---
    const atRisk = salons
      .filter(s => s._count.bookings > 0 && !b30Set.has(s.id) && s.isActive)
      .map(s => ({ id: s.id, name: s.name, slug: s.slug, totalBookings: s._count.bookings, createdAt: s.createdAt.toISOString() }))
      .sort((a, b) => b.totalBookings - a.totalBookings);

    // --- Churned salons (had bookings, inactive for 90+ days) ---
    const churned = salons
      .filter(s => s._count.bookings > 0 && !b90Set.has(s.id))
      .map(s => ({ id: s.id, name: s.name, slug: s.slug, totalBookings: s._count.bookings, createdAt: s.createdAt.toISOString() }))
      .sort((a, b) => b.totalBookings - a.totalBookings);

    // --- Summary ---
    const totalActive = b30Set.size;
    const totalChurned = churned.length;

    return NextResponse.json({
      cohorts,
      atRisk,
      churned,
      summary: {
        totalSalons: salons.length,
        activeLast30: totalActive,
        atRiskCount: atRisk.length,
        churnedCount: totalChurned,
        overallRetention: salons.length > 0 ? Math.round((totalActive / salons.length) * 100) : 0,
      },
    });
  } catch (error) {
    console.error('Churn error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
