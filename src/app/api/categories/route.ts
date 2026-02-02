import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Создать или получить демо салон
async function ensureSalonExists(salonId: string) {
  const salon = await prisma.salon.findUnique({ where: { id: salonId } });
  
  if (!salon) {
    await prisma.salon.create({
      data: {
        id: salonId,
        name: 'BookingPro Demo',
        slug: `demo-${Date.now()}`,
        type: 'Салон краси',
        description: 'Демонстраційний салон',
      },
    });
  }
}

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

// POST /api/categories - создать категорию
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { salonId, name, sortOrder = 0 } = body;

    if (!salonId || !name) {
      return NextResponse.json({ error: 'salonId and name required' }, { status: 400 });
    }

    // Убедимся что салон существует
    await ensureSalonExists(salonId);

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
