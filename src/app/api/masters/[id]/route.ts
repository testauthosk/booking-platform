import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import prisma from '@/lib/prisma';

// GET /api/masters/[id] — отримати мастера
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

    const master = await prisma.master.findUnique({
      where: { id },
      select: {
        id: true,
        salonId: true,
        name: true,
        role: true,
        phone: true,
        email: true,
        avatar: true,
        bio: true,
        color: true,
        rating: true,
        reviewCount: true,
        price: true,
        workingHours: true,
        lunchDuration: true,
        lunchStart: true,
        isActive: true,
        sortOrder: true,
        services: { include: { service: true } },
      },
    });

    if (!master) {
      return NextResponse.json({ error: 'Майстра не знайдено' }, { status: 404 });
    }

    // Перевіряємо що юзер має доступ до цього салону
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { salonId: true, role: true },
    });

    if (user?.role !== 'SUPER_ADMIN' && user?.salonId !== master.salonId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(master);
  } catch (error) {
    console.error('GET /api/masters/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/masters/[id] — оновити мастера
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
    const body = await request.json();

    // Перевіряємо доступ
    const master = await prisma.master.findUnique({
      where: { id },
      select: { salonId: true },
    });

    if (!master) {
      return NextResponse.json({ error: 'Майстра не знайдено' }, { status: 404 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { salonId: true, role: true },
    });

    if (user?.role !== 'SUPER_ADMIN' && user?.salonId !== master.salonId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Дозволені поля для оновлення
    const { name, role, phone, email, avatar, bio, color, isActive, workingHours, sortOrder } = body;

    const updated = await prisma.master.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(role !== undefined && { role }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
        ...(avatar !== undefined && { avatar }),
        ...(bio !== undefined && { bio }),
        ...(color !== undefined && { color }),
        ...(isActive !== undefined && { isActive }),
        ...(workingHours !== undefined && { workingHours }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
      select: {
        id: true, salonId: true, name: true, role: true, phone: true,
        email: true, avatar: true, bio: true, color: true, rating: true,
        reviewCount: true, price: true, workingHours: true, isActive: true, sortOrder: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('PATCH /api/masters/[id] error:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Email вже використовується' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/masters/[id] — видалити (деактивувати) мастера
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

    const master = await prisma.master.findUnique({
      where: { id },
      select: { salonId: true, name: true },
    });

    if (!master) {
      return NextResponse.json({ error: 'Майстра не знайдено' }, { status: 404 });
    }

    // Перевіряємо що юзер — власник салону
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { salonId: true, role: true },
    });

    if (user?.role !== 'SUPER_ADMIN' && user?.salonId !== master.salonId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Soft delete — деактивуємо, не видаляємо (є бронювання)
    await prisma.master.update({
      where: { id },
      data: { isActive: false },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        salonId: master.salonId,
        actorType: 'user',
        actorId: session.user.id,
        actorName: session.user.name || session.user.email || 'Owner',
        action: 'DELETE',
        entityType: 'master',
        entityId: id,
        entityName: master.name,
        changes: { event: 'Master deactivated' },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/masters/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
