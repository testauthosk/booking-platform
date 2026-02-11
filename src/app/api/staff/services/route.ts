import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyStaffToken } from '@/lib/staff-auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyStaffToken(request);
    if (auth instanceof NextResponse) return auth;

    const services = await prisma.service.findMany({
      where: { salonId: auth.salonId, isActive: true },
      orderBy: [{ category: { name: 'asc' } }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        duration: true,
        price: true,
        categoryId: true,
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(services);
  } catch (error) {
    console.error('Staff services error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
