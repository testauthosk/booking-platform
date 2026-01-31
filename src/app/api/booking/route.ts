import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

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
