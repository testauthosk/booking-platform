import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET available time slots for a date
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const salonId = searchParams.get('salonId');
    const date = searchParams.get('date');
    const masterId = searchParams.get('masterId');
    const durationParam = searchParams.get('duration');
    const serviceDuration = durationParam ? parseInt(durationParam, 10) : 60;

    if (!salonId || !date) {
      return NextResponse.json({ error: 'salonId and date required' }, { status: 400 });
    }

    // Get salon settings
    const salon = await prisma.salon.findUnique({
      where: { id: salonId, isActive: true },
      select: { bufferTime: true, workingHours: true }
    });
    if (!salon) {
      return NextResponse.json({ error: 'Salon not found' }, { status: 404 });
    }
    const bufferTime = salon.bufferTime || 0;

    // Determine working hours for this day
    const dayOfWeek = new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    let dayStart = 9 * 60; // default 09:00
    let dayEnd = 19 * 60;  // default 19:00
    let dayEnabled = true;

    // Check master-specific working hours first, then salon
    if (masterId && masterId !== 'any') {
      const master = await prisma.master.findUnique({
        where: { id: masterId },
        select: { salonId: true, workingHours: true, isActive: true },
      });
      // Verify master belongs to this salon
      if (!master || master.salonId !== salonId || !master.isActive) {
        return NextResponse.json({ error: 'Master not found' }, { status: 404 });
      }
      if (master?.workingHours) {
        const mwh = master.workingHours as Record<string, { start: string; end: string; enabled: boolean }>;
        const dayConfig = mwh[dayOfWeek];
        if (dayConfig) {
          dayEnabled = dayConfig.enabled;
          if (dayConfig.start) {
            const [sh, sm] = dayConfig.start.split(':').map(Number);
            dayStart = sh * 60 + sm;
          }
          if (dayConfig.end) {
            const [eh, em] = dayConfig.end.split(':').map(Number);
            dayEnd = eh * 60 + em;
          }
        }
      }
    } else if (salon?.workingHours) {
      const swh = salon.workingHours as Record<string, { start: string; end: string; enabled: boolean }>;
      const dayConfig = swh[dayOfWeek];
      if (dayConfig) {
        dayEnabled = dayConfig.enabled;
        if (dayConfig.start) {
          const [sh, sm] = dayConfig.start.split(':').map(Number);
          dayStart = sh * 60 + sm;
        }
        if (dayConfig.end) {
          const [eh, em] = dayConfig.end.split(':').map(Number);
          dayEnd = eh * 60 + em;
        }
      }
    }

    // Day off — no slots
    if (!dayEnabled) {
      return NextResponse.json([]);
    }

    // Get existing bookings for this date
    const bookings = await prisma.booking.findMany({
      where: {
        salonId,
        date,
        status: { not: 'CANCELLED' },
        ...(masterId && masterId !== 'any' ? { masterId } : {}),
      },
      select: { time: true, timeEnd: true, duration: true }
    });

    // Get time blocks
    const timeBlocks = masterId && masterId !== 'any'
      ? await prisma.timeBlock.findMany({
          where: { masterId, date },
          select: { startTime: true, endTime: true }
        })
      : [];

    // Build blocked intervals (start, end) in minutes
    const blocked: Array<{ start: number; end: number }> = [];

    for (const b of bookings) {
      const [h, m] = b.time.split(':').map(Number);
      const start = h * 60 + m;
      const end = b.timeEnd
        ? (() => { const [eh, em] = b.timeEnd.split(':').map(Number); return eh * 60 + em; })()
        : start + (b.duration || 60);
      blocked.push({ start, end: end + bufferTime });
    }

    for (const tb of timeBlocks) {
      const [h, m] = tb.startTime.split(':').map(Number);
      const [eh, em] = tb.endTime.split(':').map(Number);
      blocked.push({ start: h * 60 + m, end: eh * 60 + em });
    }

    // Generate slots every 30 min within working hours
    const slots: Array<{ time: string; available: boolean }> = [];
    for (let mins = dayStart; mins + serviceDuration <= dayEnd; mins += 30) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      const slotEnd = mins + serviceDuration;

      // Check overlap with blocked intervals
      const isBlocked = blocked.some(b => mins < b.end && slotEnd > b.start);

      slots.push({ time, available: !isBlocked });
    }

    return NextResponse.json(slots);
  } catch (error) {
    console.error('Slots GET error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
