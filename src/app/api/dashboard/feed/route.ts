import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import prisma from '@/lib/prisma';

export async function GET() {
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

    const salonId = user.salonId;

    // Last 5 bookings (any status, recent first)
    const recentBookings = await prisma.booking.findMany({
      where: { salonId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        clientName: true,
        serviceName: true,
        masterName: true,
        date: true,
        time: true,
        status: true,
        price: true,
        createdAt: true,
      },
    });

    const feed = recentBookings.map(b => {
      const statusLabels: Record<string, string> = {
        PENDING: '🔔 Новий запис',
        CONFIRMED: '✅ Підтверджено',
        COMPLETED: '✅ Завершено',
        CANCELLED: '❌ Скасовано',
        NO_SHOW: '⚠️ Не з\'явився',
      };

      return {
        id: b.id,
        type: b.status,
        label: statusLabels[b.status] || b.status,
        client: b.clientName,
        service: b.serviceName,
        master: b.masterName,
        date: b.date,
        time: b.time,
        price: b.price,
        createdAt: b.createdAt,
      };
    });

    return NextResponse.json({ feed });
  } catch (error) {
    console.error('Dashboard feed error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
