import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import prisma from '@/lib/prisma';

interface Alert {
  type: 'pending' | 'sleeping' | 'free_slots' | 'reviews';
  title: string;
  count: number;
  link: string;
  icon: string;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { salonId: true },
    });
    if (!user?.salonId) {
      return NextResponse.json({ error: 'No salon' }, { status: 400 });
    }

    const salonId = user.salonId;
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const alerts: Alert[] = [];

    // 1. Pending bookings (today + tomorrow)
    const pendingCount = await prisma.booking.count({
      where: {
        salonId,
        date: { in: [today, tomorrowStr] },
        status: 'PENDING',
      },
    });
    if (pendingCount > 0) {
      alerts.push({
        type: 'pending',
        title: `${pendingCount} непідтверджен${pendingCount === 1 ? 'ий' : 'их'} запис${pendingCount === 1 ? '' : 'ів'}`,
        count: pendingCount,
        link: '/calendar',
        icon: '🔔',
      });
    }

    // 2. Sleeping clients: 2+ visits, last visit > 30 days ago
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

    // Clients with 2+ visits whose latest booking is older than 30 days
    const sleepingClients = await prisma.client.count({
      where: {
        salonId,
        visitsCount: { gte: 2 },
        lastVisit: { lt: thirtyDaysAgo },
      },
    });
    if (sleepingClients > 0) {
      alerts.push({
        type: 'sleeping',
        title: `${sleepingClients} клієнт${sleepingClients === 1 ? '' : 'ів'} не повертал${sleepingClients === 1 ? 'ся' : 'ись'} 30+ днів`,
        count: sleepingClients,
        link: '/clients',
        icon: '😴',
      });
    }

    // 3. Free slots tomorrow
    const masters = await prisma.master.findMany({
      where: { salonId, isActive: true },
      select: { id: true, name: true, workingHours: true },
    });

    const tomorrowDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][tomorrow.getDay()];
    const tomorrowBookings = await prisma.booking.findMany({
      where: { salonId, date: tomorrowStr, status: { not: 'CANCELLED' } },
      select: { masterId: true, duration: true },
    });

    let totalFreeHours = 0;
    for (const m of masters) {
      const wh = m.workingHours as Record<string, { enabled?: boolean; start?: string; end?: string }> | null;
      const daySchedule = wh?.[tomorrowDay];
      if (!daySchedule?.enabled || !daySchedule.start || !daySchedule.end) continue;

      const startH = parseInt(daySchedule.start.split(':')[0]);
      const endH = parseInt(daySchedule.end.split(':')[0]);
      const workMinutes = (endH - startH) * 60;

      const bookedMinutes = tomorrowBookings
        .filter(b => b.masterId === m.id)
        .reduce((s, b) => s + (b.duration || 0), 0);

      const freeMinutes = Math.max(0, workMinutes - bookedMinutes);
      totalFreeHours += freeMinutes / 60;
    }

    if (totalFreeHours >= 2) {
      alerts.push({
        type: 'free_slots',
        title: `${Math.round(totalFreeHours)} вільних годин завтра`,
        count: Math.round(totalFreeHours),
        link: '/calendar',
        icon: '📅',
      });
    }

    // 4. New reviews (last 7 days)
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const newReviews = await prisma.review.count({
      where: {
        salonId,
        createdAt: { gte: sevenDaysAgo },
      },
    });
    if (newReviews > 0) {
      alerts.push({
        type: 'reviews',
        title: `${newReviews} нов${newReviews === 1 ? 'ий' : 'их'} відгук${newReviews === 1 ? '' : 'ів'} за тиждень`,
        count: newReviews,
        link: '/reports',
        icon: '⭐',
      });
    }

    return NextResponse.json({ alerts });
  } catch (error) {
    console.error('Dashboard alerts error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
