import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/salon/palette?salonId=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const salonId = searchParams.get('salonId');

    if (!salonId) {
      return NextResponse.json({ error: 'salonId required' }, { status: 400 });
    }

    const salon = await prisma.salon.findUnique({
      where: { id: salonId },
      select: { paletteId: true }
    });

    if (!salon) {
      return NextResponse.json({ error: 'Salon not found' }, { status: 404 });
    }

    return NextResponse.json({ paletteId: salon.paletteId });
  } catch (error) {
    console.error('Get palette error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// PUT /api/salon/palette
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { salonId, paletteId } = body;

    if (!salonId || !paletteId) {
      return NextResponse.json({ error: 'salonId and paletteId required' }, { status: 400 });
    }

    const updated = await prisma.salon.update({
      where: { id: salonId },
      data: { paletteId }
    });

    return NextResponse.json({ paletteId: updated.paletteId });
  } catch (error) {
    console.error('Update palette error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
