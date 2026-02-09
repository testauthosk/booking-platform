import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/prisma';

// GET - get single salon with full details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const salon = await prisma.salon.findUnique({
      where: { id },
      include: {
        subscription: true,
        users: {
          select: { id: true, email: true, name: true, role: true },
        },
        _count: {
          select: {
            bookings: true,
            clients: true,
            masters: true,
            services: true,
          },
        },
      },
    });

    if (!salon) {
      return NextResponse.json({ error: 'Salon not found' }, { status: 404 });
    }

    return NextResponse.json(salon);
  } catch (error) {
    console.error('Error fetching salon:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// PUT - update salon
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, slug, address, phone, isActive, ownerId } = body;

    // Check slug uniqueness if changing
    if (slug) {
      const existing = await prisma.salon.findFirst({
        where: { slug, id: { not: id } },
      });
      if (existing) {
        return NextResponse.json({ error: 'Slug already exists' }, { status: 400 });
      }
    }

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (slug !== undefined) data.slug = slug;
    if (address !== undefined) data.address = address;
    if (phone !== undefined) data.phone = phone;
    if (isActive !== undefined) data.isActive = isActive;
    if (ownerId !== undefined) data.ownerId = ownerId;

    const salon = await prisma.salon.update({
      where: { id },
      data,
      include: {
        subscription: true,
      },
    });

    // Log the change
    await prisma.auditLog.create({
      data: {
        salonId: id,
        actorType: 'ADMIN',
        actorId: session.user.id,
        actorName: session.user.email || 'Super Admin',
        action: 'UPDATE',
        entityType: 'SALON',
        entityId: id,
        entityName: salon.name,
        changes: body,
      },
    });

    return NextResponse.json(salon);
  } catch (error) {
    console.error('Error updating salon:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// DELETE - delete salon
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    // Get salon info for logging
    const salon = await prisma.salon.findUnique({
      where: { id },
      select: { name: true },
    });

    if (!salon) {
      return NextResponse.json({ error: 'Salon not found' }, { status: 404 });
    }

    // Delete salon (cascade will handle related records)
    await prisma.salon.delete({
      where: { id },
    });

    // Log the deletion
    await prisma.auditLog.create({
      data: {
        salonId: 'deleted',
        actorType: 'ADMIN',
        actorId: session.user.id,
        actorName: session.user.email || 'Super Admin',
        action: 'DELETE',
        entityType: 'SALON',
        entityId: id,
        entityName: salon.name,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting salon:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
