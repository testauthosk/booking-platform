import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/masters - список мастеров
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const salonId = searchParams.get('salonId');

    if (!salonId) {
      return NextResponse.json({ error: 'salonId required' }, { status: 400 });
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
      },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json(masters);
  } catch (error) {
    console.error('GET /api/masters error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
