import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyStaffToken } from '@/lib/staff-auth';

/**
 * GET /api/staff/masters
 * Returns all active masters from the same salon.
 * Used by staff to see colleagues for "Record colleague" feature.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyStaffToken(request);
    if (auth instanceof NextResponse) return auth;

    const masters = await prisma.master.findMany({
      where: {
        salonId: auth.salonId,
        isActive: true,
      },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        avatar: true,
        color: true,
        workingHours: true,
      },
    });

    return NextResponse.json(masters);
  } catch (error) {
    console.error('Staff masters error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
