import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/categories - список категорий
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const salonId = searchParams.get('salonId');

    if (!salonId) {
      return NextResponse.json({ error: 'salonId required' }, { status: 400 });
    }

    const categories = await prisma.serviceCategory.findMany({
      where: { salonId },
      include: {
        services: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error('GET /api/categories error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/categories - создать категорию
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { salonId, name, sortOrder = 0 } = body;

    if (!salonId || !name) {
      return NextResponse.json({ error: 'salonId and name required' }, { status: 400 });
    }

    const category = await prisma.serviceCategory.create({
      data: {
        salonId,
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
