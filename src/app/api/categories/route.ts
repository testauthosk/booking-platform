import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';

// GET /api/categories - список категорій (public for booking widget)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const salonId = searchParams.get('salonId');

    if (!salonId) {
      return NextResponse.json({ error: 'salonId required' }, { status: 400 });
    }

    const categories = await prisma.serviceCategory.findMany({
      where: { salonId },
      select: {
        id: true,
        name: true,
        sortOrder: true,
      },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json(categories, {
      headers: {
        'Cache-Control': 'private, max-age=10, stale-while-revalidate=30',
      },
    });
  } catch (error) {
    console.error('GET /api/categories error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/categories - створити категорію (owner only)
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { name, sortOrder = 0 } = body;

    if (!name) {
      return NextResponse.json({ error: 'name required' }, { status: 400 });
    }

    const category = await prisma.serviceCategory.create({
      data: {
        salonId: user.salonId,
        name,
        sortOrder,
      },
    });

    return NextResponse.json(category);
  } catch (error) {
    console.error('POST /api/categories error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
