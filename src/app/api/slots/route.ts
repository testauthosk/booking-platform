import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET available time slots for a date
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const salonId = searchParams.get('salonId');
    const date = searchParams.get('date');
    const masterId = searchParams.get('masterId');

    if (!salonId || !date) {
      return NextResponse.json({ error: 'salonId and date required' }, { status: 400 });
    }

    // Get salon for bufferTime setting
    const salon = await prisma.salon.findUnique({
      where: { id: salonId },
      select: { bufferTime: true }
    });
    const bufferTime = salon?.bufferTime || 0;

    // Get existing bookings for this date
    const bookings = await prisma.booking.findMany({
      where: {
        salonId,
        date,
        status: { not: 'CANCELLED' },
        ...(masterId && masterId !== 'any' ? { masterId } : {}),
      },
      select: {
        time: true,
        timeEnd: true,
        duration: true,
      }
    });

    // Build set of blocked times
    const blockedTimes = new Set<string>();
    bookings.forEach(booking => {
      if (booking.time) {
        blockedTimes.add(booking.time);
        // Block duration slots + buffer time
        if (booking.duration) {
          const [hours, mins] = booking.time.split(':').map(Number);
          let totalMins = hours * 60 + mins;
          const endMins = totalMins + booking.duration + bufferTime; // +buffer
          while (totalMins < endMins) {
            const h = Math.floor(totalMins / 60);
            const m = totalMins % 60;
            blockedTimes.add(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
            totalMins += 30;
          }
        }
      }
    });

    // Generate all possible times
    const allTimes = [
      "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
      "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
      "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
      "18:00", "18:30", "19:00"
    ];

    const slots = allTimes.map(time => ({
      time,
      available: !blockedTimes.has(time),
    }));

    return NextResponse.json(slots);
  } catch (error) {
    console.error('Slots GET error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
