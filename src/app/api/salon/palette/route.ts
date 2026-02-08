import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { verifyStaffToken } from '@/lib/staff-auth';

// GET /api/salon/palette?salonId=xxx (dual auth: NextAuth OR staff JWT)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const salonId = searchParams.get('salonId');

    if (!salonId) {
      return NextResponse.json({ error: 'salonId required' }, { status: 400 });
    }

    // Auth: NextAuth (owner) або JWT (staff)
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      const staffAuth = await verifyStaffToken(request);
      if (staffAuth instanceof NextResponse) return staffAuth;
      if (staffAuth.salonId !== salonId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
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

// PUT /api/salon/palette (owner only — NextAuth)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { salonId, paletteId } = body;

    if (!salonId || !paletteId) {
      return NextResponse.json({ error: 'salonId and paletteId required' }, { status: 400 });
    }

    // Перевіряємо що owner має доступ до салону
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { salonId: true, role: true },
    });

    if (user?.role !== 'SUPER_ADMIN' && user?.salonId !== salonId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
