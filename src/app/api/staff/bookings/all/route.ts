import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyStaffToken } from '@/lib/staff-auth';

/**
 * GET /api/staff/bookings/all
 * Returns ALL bookings for the salon within a date range.
 * Used by staff to see colleagues' schedules.
 * 
 * Query params:
 * - from: start date (YYYY-MM-DD)
 * - to: end date (YYYY-MM-DD)
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyStaffToken(request);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    if (!from || !to) {
      return NextResponse.json({ error: 'from and to parameters required' }, { status: 400 });
    }

    // Validate date formats
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 });
    }

    // Get all bookings for the salon within the date range
    const bookings = await prisma.booking.findMany({
      where: {
        salonId: auth.salonId,
        date: {
          gte: from,
          lte: to,
        },
        status: { not: 'CANCELLED' },
      },
      orderBy: [
        { date: 'asc' },
        { time: 'asc' },
      ],
      select: {
        id: true,
        masterId: true,
        masterName: true,
        clientName: true,
        clientPhone: true,
        serviceName: true,
        date: true,
        time: true,
        timeEnd: true,
        duration: true,
        status: true,
        price: true,
      },
    });

    return NextResponse.json(bookings);
  } catch (error) {
    console.error('Staff all bookings error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
