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

    // Overlap check — bookings
    if (masterId) {
      const [startH, startM] = time.split(':').map(Number);
      const startMin = startH * 60 + startM;
      const endMin = startMin + dur;

      const existing = await prisma.booking.findMany({
        where: { masterId, date, status: { not: 'CANCELLED' } },
        select: { time: true, timeEnd: true, duration: true, clientName: true },
      });
      for (const b of existing) {
        const [bh, bm] = b.time.split(':').map(Number);
        const bStart = bh * 60 + bm;
        const bEnd = b.timeEnd
          ? (() => { const [eh, em] = b.timeEnd.split(':').map(Number); return eh * 60 + em; })()
          : bStart + (b.duration || 60);
        if (startMin < bEnd && endMin > bStart) {
          return NextResponse.json(
            { error: `Цей час вже зайнятий (${b.time} — ${b.clientName})` },
            { status: 409 }
          );
        }
      }

      // Overlap check — time blocks
      const blocks = await prisma.timeBlock.findMany({
        where: { masterId, date },
        select: { startTime: true, endTime: true, title: true },
      });
      for (const tb of blocks) {
        const [th, tm] = tb.startTime.split(':').map(Number);
        const [teh, tem] = tb.endTime.split(':').map(Number);
        if (startMin < teh * 60 + tem && endMin > th * 60 + tm) {
          return NextResponse.json(
            { error: `Цей час заблоковано: ${tb.title || 'Перерва'} (${tb.startTime}–${tb.endTime})` },
            { status: 409 }
          );
        }
      }
    }

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
