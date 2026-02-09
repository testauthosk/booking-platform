import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';

const PLAN_PRICES: Record<string, number> = { free: 0, pro: 299, business: 599 };

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = new Date();

    // All subscriptions
    const subscriptions = await prisma.subscription.findMany({
      include: { salon: { select: { id: true, name: true, slug: true, createdAt: true } } },
    });

    // --- MRR ---
    const activeSubs = subscriptions.filter(s => s.status === 'active');
    const mrr = activeSubs.reduce((sum, s) => sum + (PLAN_PRICES[s.plan] || 0), 0);

    // --- Plan breakdown ---
    const planBreakdown = {
      free: { count: 0, revenue: 0 },
      pro: { count: 0, revenue: 0 },
      business: { count: 0, revenue: 0 },
    };
    for (const s of activeSubs) {
      const plan = s.plan as keyof typeof planBreakdown;
      if (planBreakdown[plan]) {
        planBreakdown[plan].count++;
        planBreakdown[plan].revenue += PLAN_PRICES[s.plan] || 0;
      }
    }

    // --- ARPU (Average Revenue Per User) ---
    const totalSalons = await prisma.salon.count();
    const arpu = totalSalons > 0 ? Math.round(mrr / totalSalons) : 0;

    // --- LTV estimate (ARPU × avg lifetime in months) ---
    // Average salon age in months
    const salons = await prisma.salon.findMany({ select: { createdAt: true } });
    const avgAgeMonths = salons.length > 0
      ? salons.reduce((sum, s) => sum + (now.getTime() - s.createdAt.getTime()) / (30 * 24 * 60 * 60 * 1000), 0) / salons.length
      : 0;
    const ltv = Math.round(arpu * Math.max(avgAgeMonths, 1));

    // --- Churn (cancelled in last 30 days) ---
    const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const cancelledLast30 = subscriptions.filter(s =>
      s.status === 'cancelled' && s.cancelledAt && s.cancelledAt > d30
    ).length;
    const churnRate = activeSubs.length > 0
      ? Math.round((cancelledLast30 / (activeSubs.length + cancelledLast30)) * 100)
      : 0;

    // --- MRR history (last 6 months simulation based on createdAt) ---
    const mrrHistory: { month: string; mrr: number; salons: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const monthLabel = monthDate.toLocaleDateString('uk-UA', { month: 'short', year: '2-digit' });

      // Subs that were active by this month (created before monthEnd, not cancelled before monthDate)
      const activeThen = subscriptions.filter(s =>
        s.createdAt <= monthEnd &&
        (!s.cancelledAt || s.cancelledAt > monthDate) &&
        s.plan !== 'free'
      );
      const monthMrr = activeThen.reduce((sum, s) => sum + (PLAN_PRICES[s.plan] || 0), 0);
      const salonsCount = activeThen.length;

      mrrHistory.push({ month: monthLabel, mrr: monthMrr, salons: salonsCount });
    }

    // --- Recent upgrades/downgrades from audit log ---
    const recentChanges = await prisma.auditLog.findMany({
      where: { entityType: 'SUBSCRIPTION' },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, actorName: true, entityName: true, changes: true, createdAt: true },
    });

    // --- Salons without subscription ---
    const salonsWithoutSub = await prisma.salon.count({ where: { subscription: null } });

    return NextResponse.json({
      mrr,
      arpu,
      ltv,
      churnRate,
      totalSalons,
      activePaid: activeSubs.filter(s => s.plan !== 'free').length,
      planBreakdown,
      mrrHistory,
      salonsWithoutSubscription: salonsWithoutSub,
      recentChanges,
    });
  } catch (error) {
    console.error('Revenue error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
