import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const masterId = searchParams.get('masterId');

    if (!masterId) {
      return NextResponse.json({ error: 'masterId required' }, { status: 400 });
    }

    // Get dates
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    // Week range
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekEndStr = weekEnd.toISOString().split('T')[0];

    // Get today's bookings
    const todayBookings = await prisma.booking.findMany({
      where: {
        masterId,
        date: todayStr,
        status: { not: 'CANCELLED' }
      },
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
        price: true
      }
    });

    // Count tomorrow
    const tomorrowCount = await prisma.booking.count({
      where: {
        masterId,
        date: tomorrowStr,
        status: { not: 'CANCELLED' }
      }
    });

    // Count this week
    const weekCount = await prisma.booking.count({
      where: {
        masterId,
        date: {
          gte: todayStr,
          lte: weekEndStr
        },
        status: { not: 'CANCELLED' }
      }
    });

    // Count unique clients
    const uniqueClients = await prisma.booking.groupBy({
      by: ['clientPhone'],
      where: {
        masterId,
        status: { not: 'CANCELLED' }
      }
    });

    // Find next upcoming booking (використовуємо хвилини для точного порівняння)
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTotalMinutes = currentHour * 60 + currentMinute;
    
    let nextBooking = todayBookings.find(b => {
      const [h, m] = b.time.split(':').map(Number);
      const bookingMinutes = h * 60 + m;
      return bookingMinutes > currentTotalMinutes && b.status !== 'COMPLETED';
    });
    
    // If no upcoming today, check tomorrow
    if (!nextBooking) {
      const tomorrowBookings = await prisma.booking.findFirst({
        where: {
          masterId,
          date: tomorrowStr,
          status: { not: 'CANCELLED' }
        },
        orderBy: { time: 'asc' },
        select: {
          id: true,
          clientName: true,
          serviceName: true,
          time: true,
          timeEnd: true,
          duration: true,
          status: true,
          price: true
        }
      });
      // Don't show tomorrow's as "next" for now
    }

    return NextResponse.json({
      todayCount: todayBookings.length,
      tomorrowCount,
      weekCount,
      totalClients: uniqueClients.length,
      todayBookings,
      nextBooking: nextBooking || null
    });
  } catch (error) {
    console.error('Staff dashboard error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
