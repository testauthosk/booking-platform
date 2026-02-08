import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyStaffToken, assertOwnMaster } from '@/lib/staff-auth';

// Отримати поточний час в заданій таймзоні
const getTimeInTimezone = (timezone: string) => {
  const now = new Date();
  const timeInZone = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  return timeInZone;
};

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyStaffToken(request);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const masterId = searchParams.get('masterId');
    const requestedDate = searchParams.get('date');

    const denied = assertOwnMaster(auth, masterId);
    if (denied) return denied;

    // Отримуємо timezone мастера
    const master = await prisma.master.findUnique({
      where: { id: masterId! },
      select: { timezone: true }
    });
    const timezone = master?.timezone || 'Europe/Kiev';

    // Get dates in master's timezone
    const now = getTimeInTimezone(timezone);
    const todayStr = requestedDate || now.toISOString().split('T')[0]; // Use requested date or today
    
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    // Week range (Monday to Sunday of current week)
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Days to Monday
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() + mondayOffset);
    const weekStartStr = weekStart.toISOString().split('T')[0];
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6); // Sunday
    const weekEndStr = weekEnd.toISOString().split('T')[0];

    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTotalMinutes = currentHour * 60 + currentMinute;

    // Get today's bookings
    const todayBookings = await prisma.booking.findMany({
      where: {
        masterId,
        date: todayStr,
        status: { not: 'CANCELLED' }
      },
      orderBy: { time: 'asc' },
      select: {
        id: true,
        clientName: true,
        clientPhone: true,
        serviceName: true,
        time: true,
        timeEnd: true,
        duration: true,
        status: true,
        price: true
      }
    });

    // Count tomorrow
    const tomorrowCount = await prisma.booking.count({
      where: {
        masterId,
        date: tomorrowStr,
        status: { not: 'CANCELLED' }
      }
    });

    // Count this week (Monday to Sunday)
    const weekCount = await prisma.booking.count({
      where: {
        masterId,
        date: {
          gte: weekStartStr,
          lte: weekEndStr
        },
        status: { not: 'CANCELLED' }
      }
    });

    // Count unique clients (exclude fake block entries)
    const uniqueClients = await prisma.booking.groupBy({
      by: ['clientPhone'],
      where: {
        masterId,
        status: { not: 'CANCELLED' },
        clientPhone: { not: '-' },
      }
    });

    // Find next upcoming booking
    let nextBooking = todayBookings.find(b => {
      const [h, m] = b.time.split(':').map(Number);
      const bookingMinutes = h * 60 + m;
      return bookingMinutes > currentTotalMinutes && b.status !== 'COMPLETED';
    });
    
    // If no upcoming today, check tomorrow
    if (!nextBooking) {
      const tomorrowBookings = await prisma.booking.findFirst({
        where: {
          masterId,
          date: tomorrowStr,
          status: { not: 'CANCELLED' }
        },
        orderBy: { time: 'asc' },
        select: {
          id: true,
          clientName: true,
          serviceName: true,
          time: true,
          timeEnd: true,
          duration: true,
          status: true,
          price: true
        }
      });
      // Don't show tomorrow's as "next" for now
    }

    // Fetch time blocks for today
    const todayTimeBlocks = await prisma.timeBlock.findMany({
      where: {
        masterId,
        date: todayStr,
      },
      orderBy: { startTime: 'asc' },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        title: true,
        type: true,
        isAllDay: true,
      }
    });

    return NextResponse.json({
      todayCount: todayBookings.length,
      tomorrowCount,
      weekCount,
      totalClients: uniqueClients.length,
      todayBookings,
      todayTimeBlocks,
      nextBooking: nextBooking || null,
      serverTime: now.toISOString()
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    });
  } catch (error) {
    console.error('Staff dashboard error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
