import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const phone = searchParams.get('phone');
  const salonId = searchParams.get('salonId');

  if (!phone) {
    return NextResponse.json({ error: 'Phone required' }, { status: 400 });
  }

  try {
    // Знайти клієнта за телефоном
    const client = await prisma.client.findFirst({
      where: { phone },
    });

    // Отримати всі бронювання цього клієнта (за телефоном)
    const bookings = await prisma.booking.findMany({
      where: {
        clientPhone: phone,
        status: 'COMPLETED',
        ...(salonId ? { salonId } : {}),
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

    // Підрахунок статистики
    const stats = await prisma.booking.aggregate({
      where: {
        clientPhone: phone,
        status: 'COMPLETED',
        ...(salonId ? { salonId } : {}),
      },
      _count: true,
      _sum: {
        price: true,
      },
    });

    return NextResponse.json({
      id: client?.id,
      name: client?.name,
      phone: phone,
      totalVisits: stats._count || 0,
      totalSpent: stats._sum?.price || 0,
      lastVisits: bookings,
    });
  } catch (error) {
    console.error('Error fetching client:', error);
    return NextResponse.json({ error: 'Failed to fetch client' }, { status: 500 });
  }
}
