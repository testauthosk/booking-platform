import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import prisma from '@/lib/prisma';

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

    // Get salon timezone
    const salon = await prisma.salon.findUnique({
      where: { id: salonId },
      select: { timezone: true },
    });
    const tz = salon?.timezone || 'Europe/Kiev';

    const now = new Date();
    // Get current day in salon timezone
    const dayFormatter = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' });
    const dateFormatter = new Intl.DateTimeFormat('sv-SE', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
    const todayLocal = new Date(dateFormatter.format(now) + 'T12:00:00');

    // Current week: Monday to Sunday
    const dayOfWeek = todayLocal.getDay(); // 0=Sun, 1=Mon...
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const thisMonday = new Date(todayLocal);
    thisMonday.setDate(now.getDate() + mondayOffset);
    thisMonday.setHours(0, 0, 0, 0);

    const thisSunday = new Date(thisMonday);
    thisSunday.setDate(thisMonday.getDate() + 6);

    // Previous week
    const prevMonday = new Date(thisMonday);
    prevMonday.setDate(thisMonday.getDate() - 7);
    const prevSunday = new Date(thisMonday);
    prevSunday.setDate(thisMonday.getDate() - 1);

    const thisStart = thisMonday.toISOString().split('T')[0];
    const thisEnd = thisSunday.toISOString().split('T')[0];
    const prevStart = prevMonday.toISOString().split('T')[0];
    const prevEnd = prevSunday.toISOString().split('T')[0];

    // This week bookings
    const thisBookings = await prisma.booking.findMany({
      where: { salonId, date: { gte: thisStart, lte: thisEnd }, status: { not: 'CANCELLED' } },
      select: { price: true, id: true },
    });

    // Prev week bookings
    const prevBookings = await prisma.booking.findMany({
      where: { salonId, date: { gte: prevStart, lte: prevEnd }, status: { not: 'CANCELLED' } },
      select: { price: true },
    });

    const revenue = thisBookings.reduce((s, b) => s + (b.price || 0), 0);
    const prevRevenue = prevBookings.reduce((s, b) => s + (b.price || 0), 0);
    const bookingsCount = thisBookings.length;
    const prevBookingsCount = prevBookings.length;
    const avgCheck = bookingsCount > 0 ? Math.round(revenue / bookingsCount) : 0;

    // New clients this week
    const newClients = await prisma.client.count({
      where: {
        salonId,
        createdAt: { gte: thisMonday },
      },
    });

    // Percentage changes
    const revenueChange = prevRevenue > 0
      ? Math.round(((revenue - prevRevenue) / prevRevenue) * 100)
      : revenue > 0 ? 100 : 0;

    const bookingsChange = prevBookingsCount > 0
      ? Math.round(((bookingsCount - prevBookingsCount) / prevBookingsCount) * 100)
      : bookingsCount > 0 ? 100 : 0;

    return NextResponse.json({
      revenue,
      revenuePrev: prevRevenue,
      revenueChange,
      bookings: bookingsCount,
      bookingsPrev: prevBookingsCount,
      bookingsChange,
      newClients,
      avgCheck,
    });
  } catch (error) {
    console.error('Dashboard week error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
