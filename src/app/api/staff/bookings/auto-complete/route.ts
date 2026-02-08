import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyStaffToken, assertOwnMaster } from '@/lib/staff-auth';

// POST /api/staff/bookings/auto-complete
// Автозавершення записів що закінчились — викликається з фронта при відкритті дашборда
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyStaffToken(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { masterId } = body;

    const denied = assertOwnMaster(auth, masterId);
    if (denied) return denied;

    // Get master timezone
    const master = await prisma.master.findUnique({
      where: { id: masterId },
      select: { timezone: true }
    });
    const timezone = master?.timezone || 'Europe/Kiev';

    // Current time in master's timezone
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: timezone }));
    const todayStr = now.toISOString().split('T')[0];
    const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();

    // Find confirmed bookings that have ended
    const pendingBookings = await prisma.booking.findMany({
      where: {
        masterId,
        date: todayStr,
        status: 'CONFIRMED'
      },
      select: { id: true, time: true, timeEnd: true, duration: true }
    });

    let completedCount = 0;

    for (const booking of pendingBookings) {
      const [h, m] = booking.time.split(':').map(Number);
      const endMinutes = booking.timeEnd
        ? (() => { const [eh, em] = booking.timeEnd.split(':').map(Number); return eh * 60 + em; })()
        : h * 60 + m + (booking.duration || 60);

      if (currentTotalMinutes >= endMinutes) {
        await prisma.booking.update({
          where: { id: booking.id },
          data: { status: 'COMPLETED' }
        });
        completedCount++;
      }
    }

    return NextResponse.json({ completed: completedCount });
  } catch (error) {
    console.error('Auto-complete error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
