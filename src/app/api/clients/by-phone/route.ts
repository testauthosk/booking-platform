import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { salonId: true },
    });
    if (!user?.salonId) {
      return NextResponse.json({ error: 'No salon' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');

    if (!phone) {
      return NextResponse.json({ error: 'Phone required' }, { status: 400 });
    }

    // Only search within user's salon
    const client = await prisma.client.findFirst({
      where: { phone, salonId: user.salonId },
    });

    const bookings = await prisma.booking.findMany({
      where: {
        clientPhone: phone,
        salonId: user.salonId,
        status: 'COMPLETED',
      },
      orderBy: { date: 'desc' },
      take: 10,
      select: {
        id: true,
        serviceName: true,
        date: true,
        price: true,
        masterName: true,
      },
    });

    const stats = await prisma.booking.aggregate({
      where: {
        clientPhone: phone,
        salonId: user.salonId,
        status: 'COMPLETED',
      },
      _count: true,
      _sum: { price: true },
    });

    return NextResponse.json({
      id: client?.id,
      name: client?.name,
      phone,
      totalVisits: stats._count || 0,
      totalSpent: stats._sum?.price || 0,
      lastVisits: bookings,
    });
  } catch (error) {
    console.error('Error fetching client:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
