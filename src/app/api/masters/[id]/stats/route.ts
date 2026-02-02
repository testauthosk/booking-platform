import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import prisma from '@/lib/prisma';

// GET master stats + today's bookings
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: masterId } = await params;

    // Get today's date in YYYY-MM-DD format
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // Tomorrow
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Get bookings for today
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
        serviceName: true,
        time: true,
        timeEnd: true,
        duration: true,
        status: true
      }
    });

    // Get bookings for tomorrow
    const tomorrowBookings = await prisma.booking.findMany({
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
        status: true
      }
    });

    // Count unique clients (all time)
    const uniqueClients = await prisma.booking.groupBy({
      by: ['clientPhone'],
      where: {
        masterId,
        status: { not: 'CANCELLED' }
      }
    });

    // Count total bookings this month
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthBookings = await prisma.booking.count({
      where: {
        masterId,
        createdAt: { gte: monthStart },
        status: { not: 'CANCELLED' }
      }
    });

    return NextResponse.json({
      todayCount: todayBookings.length,
      totalClients: uniqueClients.length,
      monthBookings,
      todayBookings,
      tomorrowBookings
    });
  } catch (error) {
    console.error('Master stats error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
