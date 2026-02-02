import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

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
