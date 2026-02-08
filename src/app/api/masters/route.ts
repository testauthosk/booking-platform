import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/prisma';

// GET /api/masters - список мастеров
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const salonId = searchParams.get('salonId');

    if (!salonId) {
      return NextResponse.json({ error: 'salonId required' }, { status: 400 });
    }

    // Перевіряємо що юзер має доступ до цього салону
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { salonId: true, role: true },
    });

    if (user?.role !== 'SUPER_ADMIN' && user?.salonId !== salonId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const masters = await prisma.master.findMany({
      where: { salonId, isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        color: true,
        isActive: true,
        rating: true,
        reviewCount: true,
        workingHours: true,
      },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json(masters);
  } catch (error) {
    console.error('GET /api/masters error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
