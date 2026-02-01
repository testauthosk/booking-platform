import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/salon - получить данные салона
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const salonId = searchParams.get('salonId');

    if (!salonId) {
      return NextResponse.json({ error: 'salonId required' }, { status: 400 });
    }

    const salon = await prisma.salon.findUnique({
      where: { id: salonId },
    });

    if (!salon) {
      return NextResponse.json({ error: 'Salon not found' }, { status: 404 });
    }

    return NextResponse.json(salon);
  } catch (error) {
    console.error('GET /api/salon error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/salon - обновить данные салона
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      salonId,
      name,
      slug,
      type,
      description,
      phone,
      email,
      address,
      shortAddress,
      latitude,
      longitude,
      logo,
      photos,
      workingHours,
      amenities,
    } = body;

    if (!salonId) {
      return NextResponse.json({ error: 'salonId required' }, { status: 400 });
    }

    const salon = await prisma.salon.update({
      where: { id: salonId },
      data: {
        ...(name !== undefined && { name }),
        ...(slug !== undefined && { slug }),
        ...(type !== undefined && { type }),
        ...(description !== undefined && { description }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
        ...(address !== undefined && { address }),
        ...(shortAddress !== undefined && { shortAddress }),
        ...(latitude !== undefined && { latitude }),
        ...(longitude !== undefined && { longitude }),
        ...(logo !== undefined && { logo }),
        ...(photos !== undefined && { photos }),
        ...(workingHours !== undefined && { workingHours }),
        ...(amenities !== undefined && { amenities }),
      },
    });

    return NextResponse.json(salon);
  } catch (error) {
    console.error('PATCH /api/salon error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
