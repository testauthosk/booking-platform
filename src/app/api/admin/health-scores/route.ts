import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';

// Health score breakdown:
// Profile completeness (0-25): name, address, phone, logo, workingHours, description
// Team (0-20): has masters, masters have services
// Activity (0-30): bookings in last 30 days
// Engagement (0-15): owner logged in recently, reviews enabled
// Growth (0-10): new clients in last 30 days vs previous 30

interface SalonHealth {
  salonId: string;
  salonName: string;
  slug: string;
  score: number;
  profile: number;
  team: number;
  activity: number;
  engagement: number;
  growth: number;
  risk: 'healthy' | 'warning' | 'critical';
  createdAt: string;
  lastBookingAt: string | null;
  bookingsLast30: number;
  mastersCount: number;
  clientsCount: number;
  onboardingCompleted: boolean;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const sortBy = searchParams.get('sort') || 'score'; // score | risk | activity | created
    const riskFilter = searchParams.get('risk'); // healthy | warning | critical

    const now = new Date();
    const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const d60 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const salons = await prisma.salon.findMany({
      select: {
        id: true, name: true, slug: true, phone: true, address: true,
        logo: true, workingHours: true, description: true,
        onboardingCompleted: true, createdAt: true, ownerId: true,
        _count: { select: { masters: true, clients: true, services: true, reviews: true } },
      },
    });

    // Batch queries for all salons
    const [allBookings30, allBookings60, allLatestBookings, allNewClients30, allNewClients60] = await Promise.all([
      prisma.booking.groupBy({
        by: ['salonId'],
        where: { createdAt: { gte: d30 } },
        _count: true,
      }),
      prisma.booking.groupBy({
        by: ['salonId'],
        where: { createdAt: { gte: d60, lt: d30 } },
        _count: true,
      }),
      prisma.booking.groupBy({
        by: ['salonId'],
        _max: { createdAt: true },
      }),
      prisma.client.groupBy({
        by: ['salonId'],
        where: { createdAt: { gte: d30 } },
        _count: true,
      }),
      prisma.client.groupBy({
        by: ['salonId'],
        where: { createdAt: { gte: d60, lt: d30 } },
        _count: true,
      }),
    ]);

    // Build lookup maps
    const bookings30Map = new Map(allBookings30.map(b => [b.salonId, b._count]));
    const bookings60Map = new Map(allBookings60.map(b => [b.salonId, b._count]));
    const latestBookingMap = new Map(allLatestBookings.map(b => [b.salonId, b._max.createdAt]));
    const newClients30Map = new Map(allNewClients30.map(c => [c.salonId, c._count]));
    const newClients60Map = new Map(allNewClients60.map(c => [c.salonId, c._count]));

    const results: SalonHealth[] = salons.map(salon => {
      // --- Profile (0-25) ---
      let profile = 0;
      if (salon.name && salon.name.length > 2) profile += 5;
      if (salon.address) profile += 5;
      if (salon.phone) profile += 4;
      if (salon.logo) profile += 4;
      if (salon.workingHours) profile += 4;
      if (salon.description) profile += 3;

      // --- Team (0-20) ---
      let team = 0;
      if (salon._count.masters >= 1) team += 10;
      if (salon._count.masters >= 3) team += 5;
      if (salon._count.services >= 3) team += 5;

      // --- Activity (0-30) ---
      const b30 = bookings30Map.get(salon.id) || 0;
      let activity = 0;
      if (b30 >= 1) activity += 10;
      if (b30 >= 10) activity += 10;
      if (b30 >= 30) activity += 10;

      // --- Engagement (0-15) ---
      let engagement = 0;
      if (salon.onboardingCompleted) engagement += 5;
      if (salon._count.reviews >= 1) engagement += 5;
      const lastBooking = latestBookingMap.get(salon.id);
      if (lastBooking && lastBooking > d7) engagement += 5;

      // --- Growth (0-10) ---
      const nc30 = newClients30Map.get(salon.id) || 0;
      const nc60 = newClients60Map.get(salon.id) || 0;
      let growth = 0;
      if (nc30 > 0) growth += 5;
      if (nc30 > nc60) growth += 5; // growing

      const score = profile + team + activity + engagement + growth;
      const risk: 'healthy' | 'warning' | 'critical' =
        score >= 60 ? 'healthy' : score >= 30 ? 'warning' : 'critical';

      return {
        salonId: salon.id,
        salonName: salon.name,
        slug: salon.slug,
        score,
        profile,
        team,
        activity,
        engagement,
        growth,
        risk,
        createdAt: salon.createdAt.toISOString(),
        lastBookingAt: lastBooking?.toISOString() || null,
        bookingsLast30: b30,
        mastersCount: salon._count.masters,
        clientsCount: salon._count.clients,
        onboardingCompleted: salon.onboardingCompleted,
      };
    });

    // Filter
    let filtered = results;
    if (riskFilter) {
      filtered = filtered.filter(r => r.risk === riskFilter);
    }

    // Sort
    if (sortBy === 'score') filtered.sort((a, b) => a.score - b.score); // worst first
    else if (sortBy === 'risk') filtered.sort((a, b) => a.score - b.score);
    else if (sortBy === 'activity') filtered.sort((a, b) => a.bookingsLast30 - b.bookingsLast30);
    else if (sortBy === 'created') filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Summary
    const summary = {
      total: results.length,
      healthy: results.filter(r => r.risk === 'healthy').length,
      warning: results.filter(r => r.risk === 'warning').length,
      critical: results.filter(r => r.risk === 'critical').length,
      avgScore: results.length > 0 ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length) : 0,
    };

    return NextResponse.json({ salons: filtered, summary });
  } catch (error) {
    console.error('Health scores error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
