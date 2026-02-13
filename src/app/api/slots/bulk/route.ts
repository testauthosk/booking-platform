import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET availability summary for multiple dates at once
// ?salonId=X&masterId=Y&dates=2026-02-13,2026-02-14,...&duration=120
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const salonId = searchParams.get('salonId');
    const datesParam = searchParams.get('dates');
    const masterId = searchParams.get('masterId');
    const durationParam = searchParams.get('duration');
    const serviceDuration = durationParam ? parseInt(durationParam, 10) : 60;
    const requiredSlots = Math.ceil(serviceDuration / 30);

    if (!salonId || !datesParam) {
      return NextResponse.json({ error: 'salonId and dates required' }, { status: 400 });
    }

    const dates = datesParam.split(',').slice(0, 30); // max 30 days

    // Get salon
    const salon = await prisma.salon.findUnique({
      where: { id: salonId, isActive: true },
      select: { bufferTime: true, workingHours: true }
    });
    if (!salon) {
      return NextResponse.json({ error: 'Salon not found' }, { status: 404 });
    }
    const bufferTime = salon.bufferTime || 0;

    // Get master working hours if needed
    let masterWH: Record<string, { start: string; end: string; enabled: boolean }> | null = null;
    if (masterId && masterId !== 'any') {
      const master = await prisma.master.findUnique({
        where: { id: masterId },
        select: { workingHours: true, isActive: true, salonId: true },
      });
      if (!master || master.salonId !== salonId || !master.isActive) {
        return NextResponse.json({ error: 'Master not found' }, { status: 404 });
      }
      if (master.workingHours) {
        masterWH = master.workingHours as Record<string, { start: string; end: string; enabled: boolean }>;
      }
    }

    // Fetch all bookings for all dates in one query
    const allBookings = await prisma.booking.findMany({
      where: {
        salonId,
        date: { in: dates },
        status: { not: 'CANCELLED' },
        ...(masterId && masterId !== 'any' ? { masterId } : {}),
      },
      select: { date: true, time: true, timeEnd: true, duration: true }
    });

    // Fetch all time blocks
    const allTimeBlocks = masterId && masterId !== 'any'
      ? await prisma.timeBlock.findMany({
          where: { masterId, date: { in: dates } },
          select: { date: true, startTime: true, endTime: true }
        })
      : [];

    // Group by date
    const bookingsByDate = new Map<string, typeof allBookings>();
    for (const b of allBookings) {
      const arr = bookingsByDate.get(b.date) || [];
      arr.push(b);
      bookingsByDate.set(b.date, arr);
    }
    const blocksByDate = new Map<string, typeof allTimeBlocks>();
    for (const tb of allTimeBlocks) {
      const arr = blocksByDate.get(tb.date) || [];
      arr.push(tb);
      blocksByDate.set(tb.date, arr);
    }

    const salonWH = salon.workingHours as Record<string, { start: string; end: string; enabled: boolean }> | null;

    // Calculate availability per date
    const result: Record<string, { hasAvailability: boolean; freeSlots: number; totalSlots: number }> = {};

    for (const date of dates) {
      const dayOfWeek = new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      let dayStart = 9 * 60;
      let dayEnd = 19 * 60;
      let dayEnabled = true;

      // Master hours take priority
      const wh = masterWH || salonWH;
      if (wh) {
        const dayConfig = wh[dayOfWeek];
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

      if (!dayEnabled) {
        result[date] = { hasAvailability: false, freeSlots: 0, totalSlots: 0 };
        continue;
      }

      // Build blocked intervals
      const blocked: Array<{ start: number; end: number }> = [];
      for (const b of (bookingsByDate.get(date) || [])) {
        const [h, m] = b.time.split(':').map(Number);
        const start = h * 60 + m;
        const end = b.timeEnd
          ? (() => { const [eh, em] = b.timeEnd.split(':').map(Number); return eh * 60 + em; })()
          : start + (b.duration || 60);
        blocked.push({ start, end: end + bufferTime });
      }
      for (const tb of (blocksByDate.get(date) || [])) {
        const [h, m] = tb.startTime.split(':').map(Number);
        const [eh, em] = tb.endTime.split(':').map(Number);
        blocked.push({ start: h * 60 + m, end: eh * 60 + em });
      }

      // Generate 30-min slots
      const slotAvailability: boolean[] = [];
      for (let mins = dayStart; mins + 30 <= dayEnd; mins += 30) {
        const slotEnd = mins + 30;
        const isBlocked = blocked.some(b => mins < b.end && slotEnd > b.start);
        slotAvailability.push(!isBlocked);
      }

      // Check if any position has requiredSlots consecutive free
      let hasConsecutive = false;
      let freeCount = 0;
      for (let i = 0; i <= slotAvailability.length - requiredSlots; i++) {
        let ok = true;
        for (let k = 0; k < requiredSlots; k++) {
          if (!slotAvailability[i + k]) { ok = false; break; }
        }
        if (ok) { hasConsecutive = true; freeCount++; }
      }

      result[date] = {
        hasAvailability: hasConsecutive,
        freeSlots: freeCount,
        totalSlots: slotAvailability.length,
      };
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Slots bulk GET error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
