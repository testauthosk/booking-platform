import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/prisma';
import { verifyStaffToken } from '@/lib/staff-auth';

// GET /api/masters - список мастеров (доступ: owner через NextAuth АБО master через JWT)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const salonId = searchParams.get('salonId');

    if (!salonId) {
      return NextResponse.json({ error: 'salonId required' }, { status: 400 });
    }

    // Спочатку перевіряємо NextAuth (owner/admin)
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { salonId: true, role: true },
      });
      if (user?.role !== 'SUPER_ADMIN' && user?.salonId !== salonId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else {
      // Fallback: перевіряємо JWT (staff/master)
      const staffAuth = await verifyStaffToken(request);
      if (staffAuth instanceof NextResponse) return staffAuth;
      if (staffAuth.salonId !== salonId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const masters = await prisma.master.findMany({
      where: { salonId, isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        color: true,
        isActive: true,
        rating: true,
        reviewCount: true,
        workingHours: true,
      },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json(masters);
  } catch (error) {
    console.error('GET /api/masters error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
