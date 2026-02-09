import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/prisma';

// GET all salons (admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    if (user?.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const salons = await prisma.salon.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        subscription: {
          select: { plan: true, status: true }
        },
        users: {
          where: { role: 'SALON_OWNER' },
          take: 1,
          select: { id: true, email: true, name: true }
        },
        _count: {
          select: {
            masters: true,
            bookings: true,
            clients: true,
          }
        }
      }
    });

    // Transform to include owner field
    const transformed = salons.map(salon => ({
      ...salon,
      owner: salon.users[0] || null,
      users: undefined,
    }));

    return NextResponse.json(transformed);
  } catch (error) {
    console.error('Admin salons GET error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// POST create salon
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    if (user?.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, slug, type, ownerEmail, ownerPassword } = body;

    // Check slug
    const existing = await prisma.salon.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json({ error: 'Slug already exists' }, { status: 400 });
    }

    // Create salon
    const salon = await prisma.salon.create({
      data: {
        name,
        slug,
        type: type || 'Салон краси',
        isActive: true,
      }
    });

    // Create owner if provided
    if (ownerEmail && ownerPassword) {
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.hash(ownerPassword, 10);
      
      const newUser = await prisma.user.create({
        data: {
          email: ownerEmail,
          passwordHash: hashedPassword,
          name: name,
          role: 'SALON_OWNER',
          salonId: salon.id,
        }
      });

      await prisma.salon.update({
        where: { id: salon.id },
        data: { ownerId: newUser.id }
      });
    }

    return NextResponse.json(salon);
  } catch (error) {
    console.error('Admin salon create error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// PUT update salon (toggle active, etc)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    if (user?.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { id, isActive, name, slug, address, phone } = body;

    const data: Record<string, unknown> = {};
    if (isActive !== undefined) data.isActive = isActive;
    if (name !== undefined) data.name = name;
    if (slug !== undefined) data.slug = slug;
    if (address !== undefined) data.address = address;
    if (phone !== undefined) data.phone = phone;

    const salon = await prisma.salon.update({
      where: { id },
      data
    });

    return NextResponse.json(salon);
  } catch (error) {
    console.error('Admin salon update error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
