import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';

async function verifyCategoryOwnership(categoryId: string, userId: string) {
  const category = await prisma.serviceCategory.findUnique({
    where: { id: categoryId },
    select: { salonId: true },
  });
  if (!category) return { error: 'Category not found', status: 404 };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { salonId: true },
  });
  if (category.salonId !== user?.salonId) return { error: 'Forbidden', status: 403 };

  return { salonId: category.salonId };
}

// GET /api/categories/[id]
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

    const check = await verifyCategoryOwnership(id, session.user.id);
    if ('error' in check) {
      return NextResponse.json({ error: check.error }, { status: check.status });
    }

    const category = await prisma.serviceCategory.findUnique({
      where: { id },
      include: {
        services: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    return NextResponse.json(category);
  } catch (error) {
    console.error('GET /api/categories/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/categories/[id] - оновити категорію (owner only)
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

    const check = await verifyCategoryOwnership(id, session.user.id);
    if ('error' in check) {
      return NextResponse.json({ error: check.error }, { status: check.status });
    }

    const body = await request.json();
    const { name, sortOrder } = body;

    const category = await prisma.serviceCategory.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    });

    return NextResponse.json(category);
  } catch (error) {
    console.error('PATCH /api/categories/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/categories/[id] (owner only)
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

    const check = await verifyCategoryOwnership(id, session.user.id);
    if ('error' in check) {
      return NextResponse.json({ error: check.error }, { status: check.status });
    }

    await prisma.service.updateMany({
      where: { categoryId: id },
      data: { categoryId: null },
    });

    await prisma.serviceCategory.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/categories/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
