import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// GET - get single user
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

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        salonId: true,
        telegramChatId: true,
        telegramId: true,
        telegramUsername: true,
        notificationsEnabled: true,
        createdAt: true,
        updatedAt: true,
        salon: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// PUT - update user (role, block status, etc.)
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
    const { name, email, phone, role, salonId, notificationsEnabled } = body;

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (email !== undefined) data.email = email;
    if (phone !== undefined) data.phone = phone;
    if (role !== undefined) data.role = role;
    if (salonId !== undefined) data.salonId = salonId;
    if (notificationsEnabled !== undefined) data.notificationsEnabled = notificationsEnabled;

    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        salonId: true,
        salon: { select: { id: true, name: true, slug: true } },
      },
    });

    // Log the change
    await prisma.auditLog.create({
      data: {
        salonId: user.salonId || 'system',
        actorType: 'ADMIN',
        actorId: session.user.id,
        actorName: session.user.email || 'Super Admin',
        action: 'UPDATE',
        entityType: 'USER',
        entityId: id,
        entityName: user.name || user.email,
        changes: body,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// DELETE - delete user
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

    // Prevent self-deletion
    if (id === session.user.id) {
      return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: { name: true, email: true, salonId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await prisma.user.delete({
      where: { id },
    });

    // Log the deletion
    await prisma.auditLog.create({
      data: {
        salonId: user.salonId || 'system',
        actorType: 'ADMIN',
        actorId: session.user.id,
        actorName: session.user.email || 'Super Admin',
        action: 'DELETE',
        entityType: 'USER',
        entityId: id,
        entityName: user.name || user.email,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
