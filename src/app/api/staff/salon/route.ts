import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyStaffToken } from '@/lib/staff-auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyStaffToken(request);
    if (auth instanceof NextResponse) return auth;

    const salon = await prisma.salon.findUnique({
      where: { id: auth.salonId },
      select: {
        id: true,
        timezone: true,
        workingHours: true,
      },
    });

    if (!salon) {
      return NextResponse.json({ error: 'Salon not found' }, { status: 404 });
    }

    return NextResponse.json(salon);
  } catch (error) {
    console.error('Staff salon error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
