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

// GET /api/services - список услуг
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const salonId = searchParams.get('salonId');
    const categoryId = searchParams.get('categoryId');

    if (!salonId) {
      return NextResponse.json({ error: 'salonId required' }, { status: 400 });
    }

    const services = await prisma.service.findMany({
      where: {
        salonId,
        isActive: true,
        ...(categoryId && { categoryId }),
      },
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json(services, {
      headers: {
        'Cache-Control': 'private, max-age=10, stale-while-revalidate=30',
      },
    });
  } catch (error) {
    console.error('GET /api/services error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/services - создать услугу
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      salonId,
      categoryId,
      name,
      description,
      price,
      priceFrom = false,
      duration = 30,
      sortOrder = 0,
    } = body;

    if (!salonId || !name || price === undefined) {
      return NextResponse.json(
        { error: 'salonId, name and price required' },
        { status: 400 }
      );
    }

    // Убедимся что салон существует
    await ensureSalonExists(salonId);

    const service = await prisma.service.create({
      data: {
        salonId,
        categoryId: categoryId || null,
        name,
        description,
        price,
        priceFrom,
        duration,
        sortOrder,
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json(service);
  } catch (error) {
    console.error('POST /api/services error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
