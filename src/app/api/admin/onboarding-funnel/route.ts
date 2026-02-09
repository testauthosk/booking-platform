import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';

// Funnel stages:
// 1. Registered (has User record)
// 2. Onboarding completed (salon.onboardingCompleted = true)
// 3. Added masters (masters count >= 1)
// 4. Added services (services count >= 1)
// 5. First booking received
// 6. 10+ bookings (active usage)

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const salons = await prisma.salon.findMany({
      select: {
        id: true, name: true, slug: true, onboardingCompleted: true, createdAt: true,
        _count: { select: { masters: true, services: true, bookings: true, clients: true } },
      },
    });

    // Funnel counts
    const registered = salons.length;
    const onboarded = salons.filter(s => s.onboardingCompleted).length;
    const hasMasters = salons.filter(s => s._count.masters >= 1).length;
    const hasServices = salons.filter(s => s._count.services >= 1).length;
    const hasBookings = salons.filter(s => s._count.bookings >= 1).length;
    const active = salons.filter(s => s._count.bookings >= 10).length;

    const funnel = [
      { stage: 'Реєстрація', count: registered, pct: 100 },
      { stage: 'Онбордінг завершено', count: onboarded, pct: registered > 0 ? Math.round((onboarded / registered) * 100) : 0 },
      { stage: 'Додали майстра', count: hasMasters, pct: registered > 0 ? Math.round((hasMasters / registered) * 100) : 0 },
      { stage: 'Додали послуги', count: hasServices, pct: registered > 0 ? Math.round((hasServices / registered) * 100) : 0 },
      { stage: 'Перший запис', count: hasBookings, pct: registered > 0 ? Math.round((hasBookings / registered) * 100) : 0 },
      { stage: 'Активні (10+ записів)', count: active, pct: registered > 0 ? Math.round((active / registered) * 100) : 0 },
    ];

    // Drop-off per stage
    const dropoffs = funnel.map((stage, i) => ({
      ...stage,
      dropoff: i === 0 ? 0 : funnel[i - 1].count - stage.count,
      dropoffPct: i === 0 ? 0 : funnel[i - 1].count > 0
        ? Math.round(((funnel[i - 1].count - stage.count) / funnel[i - 1].count) * 100)
        : 0,
    }));

    // Stuck salons — registered but not onboarded
    const stuckAtOnboarding = salons
      .filter(s => !s.onboardingCompleted)
      .map(s => ({ id: s.id, name: s.name, slug: s.slug, createdAt: s.createdAt.toISOString() }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Onboarded but no masters
    const stuckAtMasters = salons
      .filter(s => s.onboardingCompleted && s._count.masters === 0)
      .map(s => ({ id: s.id, name: s.name, slug: s.slug, createdAt: s.createdAt.toISOString() }));

    // Has masters but no bookings
    const stuckAtBookings = salons
      .filter(s => s._count.masters >= 1 && s._count.services >= 1 && s._count.bookings === 0)
      .map(s => ({ id: s.id, name: s.name, slug: s.slug, createdAt: s.createdAt.toISOString() }));

    return NextResponse.json({
      funnel: dropoffs,
      stuck: {
        onboarding: stuckAtOnboarding,
        masters: stuckAtMasters,
        bookings: stuckAtBookings,
      },
    });
  } catch (error) {
    console.error('Onboarding funnel error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
