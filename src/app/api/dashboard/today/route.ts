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

    // Use salon timezone for date/time calculations
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('sv-SE', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
    const today = formatter.format(now); // "YYYY-MM-DD"
    const timeFormatter = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false });
    const currentTime = timeFormatter.format(now); // "HH:MM"

    // All today's bookings (not cancelled)
    const todayBookings = await prisma.booking.findMany({
      where: { salonId, date: today, status: { not: 'CANCELLED' } },
      select: {
        id: true,
        time: true,
        timeEnd: true,
        duration: true,
        price: true,
        status: true,
        masterId: true,
        masterName: true,
        serviceName: true,
        clientName: true,
        clientPhone: true,
      },
      orderBy: { time: 'asc' },
    });

    const cancelled = await prisma.booking.count({
      where: { salonId, date: today, status: 'CANCELLED' },
    });

    const total = todayBookings.length;
    const completed = todayBookings.filter(b => b.status === 'COMPLETED').length;
    const remaining = total - completed;
    const revenue = todayBookings.reduce((sum, b) => sum + (b.price || 0), 0);

    // Next client: first booking after current time that's not completed
    const nextBooking = todayBookings.find(
      b => b.time >= currentTime && b.status !== 'COMPLETED' && b.status !== 'NO_SHOW'
    );

    const nextClient = nextBooking
      ? {
          name: nextBooking.clientName,
          phone: nextBooking.clientPhone,
          time: nextBooking.time,
          service: nextBooking.serviceName,
          master: nextBooking.masterName,
        }
      : null;

    // Masters status
    const masters = await prisma.master.findMany({
      where: { salonId, isActive: true },
      select: {
        id: true,
        name: true,
        avatar: true,
        color: true,
        workingHours: true,
      },
    });

    const dayFormatter = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'long' });
    const dayOfWeek = dayFormatter.format(now).toLowerCase(); // "monday", "tuesday", etc.

    const masterStatuses = masters.map(m => {
      const wh = m.workingHours as Record<string, { enabled?: boolean; start?: string; end?: string }> | null;
      const daySchedule = wh?.[dayOfWeek];
      const isWorkingToday = daySchedule?.enabled !== false && daySchedule?.start && daySchedule?.end;

      if (!isWorkingToday) {
        return { id: m.id, name: m.name, avatar: m.avatar, color: m.color, status: 'off' as const };
      }

      // Check if master has a booking right now
      const currentBooking = todayBookings.find(
        b => b.masterId === m.id && b.time <= currentTime && (b.timeEnd || '') > currentTime && b.status !== 'COMPLETED'
      );

      // Next booking for this master
      const nextMasterBooking = todayBookings.find(
        b => b.masterId === m.id && b.time > currentTime && b.status !== 'COMPLETED'
      );

      if (currentBooking) {
        return {
          id: m.id,
          name: m.name,
          avatar: m.avatar,
          color: m.color,
          status: 'working' as const,
          currentService: currentBooking.serviceName,
          currentUntil: currentBooking.timeEnd,
          currentClient: currentBooking.clientName,
        };
      }

      return {
        id: m.id,
        name: m.name,
        avatar: m.avatar,
        color: m.color,
        status: 'free' as const,
        nextAt: nextMasterBooking?.time || null,
      };
    });

    return NextResponse.json({
      bookings: { total, completed, remaining, cancelled },
      revenue,
      nextClient,
      masters: masterStatuses,
    });
  } catch (error) {
    console.error('Dashboard today error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
