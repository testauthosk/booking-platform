import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import prisma from '@/lib/prisma';

// GET bookings for salon
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

    const bookings = await prisma.booking.findMany({
      where: { salonId: user.salonId },
      orderBy: [{ date: 'desc' }, { time: 'asc' }],
      take: 100,
      include: {
        master: { select: { name: true } },
        service: { select: { name: true } }
      }
    });

    return NextResponse.json(bookings);
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
      duration = 60,
      price = 0,
      notes,
    } = data;

    if (!salonId || !clientName || !clientPhone || !date || !time) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
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

    // Send notification (async)
    try {
      const baseUrl = request.nextUrl.origin;
      fetch(`${baseUrl}/api/telegram/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: booking.id }),
      }).catch(console.error);
    } catch (e) {
      console.error('Failed to send notification:', e);
    }

    return NextResponse.json(booking);
  } catch (error) {
    console.error('Booking creation error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
