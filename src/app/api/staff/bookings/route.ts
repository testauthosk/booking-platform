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
    const endMinutes = hours * 60 + minutes + (duration || 60);
    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;
    const timeEnd = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;

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
