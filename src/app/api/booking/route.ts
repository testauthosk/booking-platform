import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import prisma from '@/lib/prisma';

// GET bookings for salon
// Query params: from (YYYY-MM-DD), to (YYYY-MM-DD) — date range filter
// Without params: returns current month ±7 days
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { salonId: true }
    });

    if (!user?.salonId) {
      return NextResponse.json({ error: 'No salon' }, { status: 400 });
    }

    // Date range filter
    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');

    let fromDate: string;
    let toDate: string;

    if (fromParam && toParam) {
      fromDate = fromParam;
      toDate = toParam;
    } else {
      // Default: current month ±7 days buffer
      const now = new Date();
      const from = new Date(now);
      from.setDate(1);
      from.setDate(from.getDate() - 7);
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 0); // last day of month
      to.setDate(to.getDate() + 7);
      fromDate = from.toISOString().split('T')[0];
      toDate = to.toISOString().split('T')[0];
    }

    // Fetch bookings in date range (auto-complete moved to POST /api/staff/bookings/auto-complete)
    const bookings = await prisma.booking.findMany({
      where: {
        salonId: user.salonId,
        date: { gte: fromDate, lte: toDate },
      },
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
      include: {
        master: { select: { name: true } },
        service: { select: { name: true } },
        client: { select: { visitsCount: true } }
      }
    });

    // Return with explicit serviceId, clientId and isNewClient
    const result = bookings.map(b => ({
      ...b,
      serviceId: b.serviceId,
      clientId: b.clientId,
      isNewClient: b.client ? b.client.visitsCount <= 1 : false,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Bookings GET error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// PUT update booking (status, time, master, duration)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, status, date, time, timeEnd, duration, masterId } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    // Get existing booking
    const existingBooking = await prisma.booking.findUnique({
      where: { id },
      select: { salonId: true, masterId: true, date: true, time: true, duration: true }
    });

    if (!existingBooking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Verify booking belongs to user's salon
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { salonId: true },
    });
    if (existingBooking.salonId !== currentUser?.salonId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    
    if (status !== undefined) {
      updateData.status = status.toUpperCase();
    }
    if (date !== undefined) {
      updateData.date = date;
    }
    if (time !== undefined) {
      updateData.time = time;
    }
    if (timeEnd !== undefined) {
      updateData.timeEnd = timeEnd;
    }
    if (duration !== undefined) {
      updateData.duration = duration;
    }
    if (masterId !== undefined) {
      updateData.masterId = masterId;
      // Also update masterName
      if (masterId) {
        const master = await prisma.master.findUnique({
          where: { id: masterId },
          select: { name: true }
        });
        if (master) {
          updateData.masterName = master.name;
        }
      }
    }

    // Check for time conflicts when changing time/date/master
    const checkDate = date ?? existingBooking.date;
    const checkTime = time ?? existingBooking.time;
    const checkMasterId = masterId ?? existingBooking.masterId;
    const checkDuration = duration ?? existingBooking.duration ?? 60;

    if (checkMasterId && (date !== undefined || time !== undefined || masterId !== undefined)) {
      const [startHour, startMin] = checkTime.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = startMinutes + checkDuration;

      const conflictingBookings = await prisma.booking.findMany({
        where: {
          salonId: existingBooking.salonId,
          masterId: checkMasterId,
          date: checkDate,
          status: { not: 'CANCELLED' },
          id: { not: id }, // Exclude current booking
        },
        select: { id: true, time: true, timeEnd: true, duration: true, clientName: true }
      });

      for (const existing of conflictingBookings) {
        const [exStartHour, exStartMin] = existing.time.split(':').map(Number);
        const exStartMinutes = exStartHour * 60 + exStartMin;
        const exEndMinutes = existing.timeEnd 
          ? (() => { const [h, m] = existing.timeEnd.split(':').map(Number); return h * 60 + m; })()
          : exStartMinutes + (existing.duration || 60);

        if (startMinutes < exEndMinutes && endMinutes > exStartMinutes) {
          return NextResponse.json({ 
            error: `Цей час вже зайнятий (${existing.time} - ${existing.clientName})` 
          }, { status: 409 });
        }
      }
    }

    const booking = await prisma.booking.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json(booking);
  } catch (error) {
    console.error('Bookings PUT error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// DELETE booking
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    // Verify booking belongs to user's salon
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { salonId: true },
    });
    const booking = await prisma.booking.findUnique({
      where: { id },
      select: { salonId: true },
    });
    if (!booking) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (booking.salonId !== user?.salonId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.booking.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Bookings DELETE error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    const {
      clientId,
      masterId,
      serviceId,
      clientName,
      clientPhone,
      clientEmail,
      serviceName,
      masterName,
      date,
      time,
      timeEnd,
      duration = 60,
      price = 0,
      notes,
    } = data;

    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Always use user's salonId — never trust client input
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { salonId: true },
    });
    const salonId = user?.salonId;

    if (!salonId) {
      return NextResponse.json({ error: 'No salon' }, { status: 400 });
    }

    if (!clientName || !clientPhone || !date || !time) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify masterId belongs to this salon
    if (masterId) {
      const master = await prisma.master.findUnique({
        where: { id: masterId },
        select: { salonId: true },
      });
      if (!master || master.salonId !== salonId) {
        return NextResponse.json({ error: 'Майстер не належить цьому салону' }, { status: 403 });
      }
    }

    // Verify serviceId belongs to this salon
    if (serviceId) {
      const service = await prisma.service.findUnique({
        where: { id: serviceId },
        select: { salonId: true },
      });
      if (!service || service.salonId !== salonId) {
        return NextResponse.json({ error: 'Послуга не належить цьому салону' }, { status: 403 });
      }
    }

    // Check if booking is in the past
    const bookingDateTime = new Date(`${date}T${time}:00`);
    const now = new Date();
    if (bookingDateTime < now) {
      return NextResponse.json({ 
        error: 'Неможливо створити запис на минулий час' 
      }, { status: 400 });
    }

    // Check for time conflicts (same master, same date, overlapping time)
    if (masterId) {
      // Calculate booking end time
      const [startHour, startMin] = time.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = startMinutes + (duration || 60);
      const calculatedTimeEnd = timeEnd || `${Math.floor(endMinutes / 60).toString().padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}`;

      // Find conflicting bookings
      const conflictingBookings = await prisma.booking.findMany({
        where: {
          salonId,
          masterId,
          date,
          status: { not: 'CANCELLED' },
        },
        select: { id: true, time: true, timeEnd: true, duration: true, clientName: true }
      });

      for (const existing of conflictingBookings) {
        const [exStartHour, exStartMin] = existing.time.split(':').map(Number);
        const exStartMinutes = exStartHour * 60 + exStartMin;
        const exEndMinutes = existing.timeEnd 
          ? (() => { const [h, m] = existing.timeEnd.split(':').map(Number); return h * 60 + m; })()
          : exStartMinutes + (existing.duration || 60);

        // Check overlap: new booking starts before existing ends AND new booking ends after existing starts
        if (startMinutes < exEndMinutes && endMinutes > exStartMinutes) {
          return NextResponse.json({ 
            error: `Цей час вже зайнятий (${existing.time} - ${existing.clientName})` 
          }, { status: 409 });
        }
      }
    }

    const booking = await prisma.booking.create({
      data: {
        salonId,
        clientId,
        masterId,
        serviceId,
        clientName,
        clientPhone,
        clientEmail,
        serviceName,
        masterName,
        date,
        time,
        timeEnd,
        duration,
        price,
        notes,
        status: 'CONFIRMED',
      }
    });

    // Update client stats if linked
    if (clientId) {
      await prisma.client.update({
        where: { id: clientId },
        data: {
          visitsCount: { increment: 1 },
          totalSpent: { increment: price },
          lastVisit: new Date(),
        }
      });
    }

    // Send Telegram notification to salon owner (fire-and-forget)
    try {
      const salon = await prisma.salon.findUnique({
        where: { id: salonId },
        select: { name: true, ownerId: true },
      });
      if (salon?.ownerId) {
        const owner = await prisma.user.findUnique({
          where: { id: salon.ownerId },
          select: { telegramChatId: true },
        });
        if (owner?.telegramChatId) {
          const { notifySalonOwner } = await import('@/lib/telegram');
          notifySalonOwner(owner.telegramChatId, {
            clientName,
            clientPhone,
            serviceName: serviceName || 'Послуга',
            masterName,
            date,
            time,
            duration,
            price,
            salonName: salon.name,
          }).catch(console.error);
        }
      }
    } catch (e) {
      console.error('Failed to send notification:', e);
    }

    return NextResponse.json(booking);
  } catch (error) {
    console.error('Booking creation error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
