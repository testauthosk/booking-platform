import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/catalogue - категории и услуги одним запросом
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const salonId = searchParams.get('salonId');

    if (!salonId) {
      return NextResponse.json({ error: 'salonId required' }, { status: 400 });
    }

    // Один запрос вместо двух
    const [categories, services] = await Promise.all([
      prisma.serviceCategory.findMany({
        where: { salonId },
        select: { id: true, name: true, sortOrder: true },
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.service.findMany({
        where: { salonId, isActive: true },
        select: {
          id: true,
          name: true,
          description: true,
          categoryId: true,
          price: true,
          priceFrom: true,
          duration: true,
          sortOrder: true,
          category: { select: { id: true, name: true } },
        },
        orderBy: { sortOrder: 'asc' },
      }),
    ]);

    return NextResponse.json(
      { categories, services },
      {
        headers: {
          'Cache-Control': 'private, max-age=5, stale-while-revalidate=30',
        },
      }
    );
  } catch (error) {
    console.error('GET /api/catalogue error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
