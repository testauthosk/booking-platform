import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { logAudit } from '@/lib/audit';

// GET /api/services - список услуг (public for booking widget)
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

// POST /api/services - створити послугу (owner only)
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
    const {
      categoryId,
      name,
      description,
      price,
      priceFrom = false,
      duration = 30,
      sortOrder = 0,
    } = body;

    if (!name || price === undefined) {
      return NextResponse.json(
        { error: 'name and price required' },
        { status: 400 }
      );
    }

    const service = await prisma.service.create({
      data: {
        salonId: user.salonId,
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

    await logAudit({
      salonId: user.salonId,
      actorType: 'admin',
      actorId: session.user.id,
      actorName: session.user.name || 'Owner',
      action: 'CREATE',
      entityType: 'service',
      entityId: service.id,
      entityName: name,
    });

    return NextResponse.json(service);
  } catch (error) {
    console.error('POST /api/services error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
