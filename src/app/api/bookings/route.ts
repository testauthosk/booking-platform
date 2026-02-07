import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import prisma from '@/lib/prisma';

// POST /api/bookings - створити бронювання
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { masterId, clientName, clientPhone, serviceName, date, time, duration, price, notes } = body;

    if (!masterId || !clientName || !date || !time) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const dur = duration || 60;
    const [h, m] = time.split(':').map(Number);
    const endMin = h * 60 + m + dur;
    const timeEnd = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;

    const master = await prisma.master.findUnique({ where: { id: masterId }, select: { name: true } });

    const booking = await prisma.booking.create({
      data: {
        salonId: user.salonId,
        masterId,
        masterName: master?.name || 'Unknown',
        clientName,
        clientPhone: clientPhone || '',
        serviceName: serviceName || 'Послуга',
        date,
        time,
        timeEnd,
        duration: dur,
        price: price || 0,
        notes: notes || null,
        status: 'CONFIRMED',
      }
    });

    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    console.error('POST /api/bookings error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
