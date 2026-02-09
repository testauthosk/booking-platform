import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';

// Helper: verify user owns the service's salon
async function verifyServiceOwnership(serviceId: string, userId: string) {
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    select: { salonId: true },
  });
  if (!service) return { error: 'Service not found', status: 404 };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { salonId: true },
  });
  if (service.salonId !== user?.salonId) return { error: 'Forbidden', status: 403 };

  return { salonId: service.salonId };
}

// GET /api/services/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const check = await verifyServiceOwnership(id, session.user.id);
    if ('error' in check) {
      return NextResponse.json({ error: check.error }, { status: check.status });
    }

    const service = await prisma.service.findUnique({
      where: { id },
      include: {
        category: true,
        masters: {
          include: {
            master: {
              select: { id: true, name: true, avatar: true, role: true },
            },
          },
        },
      },
    });

    return NextResponse.json(service);
  } catch (error) {
    console.error('GET /api/services/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/services/[id] - оновити послугу (owner only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const check = await verifyServiceOwnership(id, session.user.id);
    if ('error' in check) {
      return NextResponse.json({ error: check.error }, { status: check.status });
    }

    const body = await request.json();
    const { categoryId, name, description, price, priceFrom, duration, sortOrder, isActive } = body;

    const service = await prisma.service.update({
      where: { id },
      data: {
        ...(categoryId !== undefined && { categoryId: categoryId || null }),
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(price !== undefined && { price }),
        ...(priceFrom !== undefined && { priceFrom }),
        ...(duration !== undefined && { duration }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(isActive !== undefined && { isActive }),
      },
      include: { category: true },
    });

    return NextResponse.json(service);
  } catch (error) {
    console.error('PATCH /api/services/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/services/[id] - мʼяке видалення (owner only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const check = await verifyServiceOwnership(id, session.user.id);
    if ('error' in check) {
      return NextResponse.json({ error: check.error }, { status: check.status });
    }

    await prisma.service.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/services/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
