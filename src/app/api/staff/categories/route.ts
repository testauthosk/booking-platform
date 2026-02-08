import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyStaffToken } from '@/lib/staff-auth';

// GET categories for salon (for master to select)
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyStaffToken(request);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const salonId = searchParams.get('salonId');

    if (!salonId) {
      return NextResponse.json({ error: 'salonId required' }, { status: 400 });
    }

    // Мастер може бачити категорії тільки свого салону
    if (auth.salonId !== salonId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const categories = await prisma.serviceCategory.findMany({
      where: { salonId },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true
      }
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error('Staff categories error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
