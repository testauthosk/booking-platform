import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { masterId, salonId, serviceId, clientName, clientPhone, date, time, duration, price, serviceName } = body;

    if (!masterId || !clientName || !clientPhone || !date || !time) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Calculate timeEnd
    const [hours, minutes] = time.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + (duration || 60);
    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;
    const timeEnd = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;

    // Check for overlapping bookings
    const existingBookings = await prisma.booking.findMany({
      where: {
        masterId,
        date,
        status: { not: 'CANCELLED' }
      },
      select: { time: true, timeEnd: true, duration: true }
    });

    // Check if new booking overlaps with any existing booking
    for (const existing of existingBookings) {
      const [exH, exM] = existing.time.split(':').map(Number);
      const exStart = exH * 60 + exM;
      const exEnd = exStart + existing.duration;
      
      // Check overlap: new booking starts before existing ends AND new booking ends after existing starts
      if (startMinutes < exEnd && endMinutes > exStart) {
        return NextResponse.json({ 
          error: 'На цей час вже є запис', 
          overlappingTime: existing.time 
        }, { status: 409 });
      }
    }

    // Get master info
    const master = await prisma.master.findUnique({
      where: { id: masterId },
      select: { name: true, salonId: true }
    });

    if (!master) {
      return NextResponse.json({ error: 'Master not found' }, { status: 404 });
    }

    const booking = await prisma.booking.create({
      data: {
        salonId: salonId || master.salonId,
        masterId,
        serviceId: serviceId || null,
        clientName,
        clientPhone,
        clientEmail: null,
        serviceName: serviceName || 'Запис',
        masterName: master.name,
        date,
        time,
        timeEnd,
        duration: duration || 60,
        price: price || 0,
        status: 'CONFIRMED'
      }
    });

    return NextResponse.json(booking);
  } catch (error) {
    console.error('Create booking error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const masterId = searchParams.get('masterId');
    const date = searchParams.get('date');

    if (!masterId) {
      return NextResponse.json({ error: 'masterId required' }, { status: 400 });
    }

    const where: Record<string, unknown> = {
      masterId,
      status: { not: 'CANCELLED' }
    };

    if (date) {
      where.date = date;
    }

    const bookings = await prisma.booking.findMany({
      where,
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
        price: true,
        date: true
      }
    });

    return NextResponse.json(bookings);
  } catch (error) {
    console.error('Staff bookings error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// PUT - Update booking (time, duration)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingId, time, duration } = body;

    if (!bookingId) {
      return NextResponse.json({ error: 'bookingId required' }, { status: 400 });
    }

    // Calculate new timeEnd if time or duration changed
    const updateData: Record<string, unknown> = {};
    
    if (time) {
      updateData.time = time;
    }
    
    if (duration) {
      updateData.duration = duration;
    }

    // Recalculate timeEnd
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const newTime = time || booking.time;
    const newDuration = duration || booking.duration;
    const [hours, minutes] = newTime.split(':').map(Number);
    const endMinutes = hours * 60 + minutes + newDuration;
    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;
    updateData.timeEnd = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: updateData
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update booking error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// PATCH - Update booking status (NO_SHOW, CANCELLED, COMPLETED)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingId, status } = body;

    if (!bookingId || !status) {
      return NextResponse.json({ error: 'bookingId and status required' }, { status: 400 });
    }

    if (!['NO_SHOW', 'CANCELLED', 'COMPLETED', 'CONFIRMED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: { status }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update booking status error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
