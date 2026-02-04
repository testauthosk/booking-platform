import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import prisma from '@/lib/prisma';

// GET - отримати історію записів клієнта
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: clientId } = await params;

    // Перевіряємо що клієнт належить салону користувача
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { salonId: true }
    });

    if (!user?.salonId) {
      return NextResponse.json({ error: 'No salon' }, { status: 400 });
    }

    const client = await prisma.client.findFirst({
      where: { 
        id: clientId,
        salonId: user.salonId 
      }
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Отримуємо записи клієнта
    const bookings = await prisma.booking.findMany({
      where: { clientId },
      orderBy: { date: 'desc' },
      take: 50,
      select: {
        id: true,
        date: true,
        time: true,
        serviceId: true,
        serviceName: true,
        masterId: true,
        masterName: true,
        price: true,
        status: true,
      }
    });

    return NextResponse.json(bookings);
  } catch (error) {
    console.error('Client bookings GET error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
