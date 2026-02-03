import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { BookingStatus } from '@prisma/client';

// GET - all bookings across all salons
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const salonId = searchParams.get('salonId');
    const status = searchParams.get('status');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: any = {};

    if (salonId) where.salonId = salonId;
    if (status) where.status = status as BookingStatus;
    if (dateFrom) where.date = { ...where.date, gte: dateFrom };
    if (dateTo) where.date = { ...where.date, lte: dateTo };
    if (search) {
      where.OR = [
        { clientName: { contains: search, mode: 'insensitive' } },
        { clientPhone: { contains: search } },
        { serviceName: { contains: search, mode: 'insensitive' } },
        { masterName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [bookings, total, stats] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          salon: { select: { id: true, name: true, slug: true } },
          master: { select: { id: true, name: true } },
          service: { select: { id: true, name: true } },
          client: { select: { id: true, name: true, telegramChatId: true } },
        },
        orderBy: [{ date: 'desc' }, { time: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.booking.count({ where }),
      prisma.booking.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
    ]);

    // Calculate stats
    const statusCounts: Record<string, number> = {};
    stats.forEach(s => {
      statusCounts[s.status] = s._count._all;
    });

    // Today's stats
    const today = new Date().toISOString().split('T')[0];
    const todayCount = await prisma.booking.count({
      where: { date: today },
    });

    // Revenue this month
    const monthStart = new Date();
    monthStart.setDate(1);
    const monthRevenue = await prisma.booking.aggregate({
      where: {
        status: 'COMPLETED',
        createdAt: { gte: monthStart },
      },
      _sum: { price: true },
    });

    return NextResponse.json({
      bookings,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      stats: {
        byStatus: statusCounts,
        today: todayCount,
        monthRevenue: monthRevenue._sum.price || 0,
      },
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
  }
}

// PUT - update booking status
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, status, ...data } = body;

    const booking = await prisma.booking.update({
      where: { id },
      data: {
        status: status as BookingStatus,
        ...data,
      },
      include: {
        salon: { select: { name: true } },
      },
    });

    return NextResponse.json(booking);
  } catch (error) {
    console.error('Error updating booking:', error);
    return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 });
  }
}

// DELETE - delete booking
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    await prisma.booking.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting booking:', error);
    return NextResponse.json({ error: 'Failed to delete booking' }, { status: 500 });
  }
}
