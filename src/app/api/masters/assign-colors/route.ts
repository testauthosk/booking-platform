import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import prisma from '@/lib/prisma';

// POST /api/masters/assign-colors — assign random palette colors to all masters
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { salonId: true, role: true }
    });

    if (!user?.salonId || (user.role !== 'SALON_OWNER' && user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { colors } = body as { colors: string[] };

    if (!colors || !Array.isArray(colors) || colors.length === 0) {
      return NextResponse.json({ error: 'Colors array required' }, { status: 400 });
    }

    // Get all active masters
    const masters = await prisma.master.findMany({
      where: { salonId: user.salonId, isActive: true },
      select: { id: true },
      orderBy: { sortOrder: 'asc' },
    });

    // Shuffle colors for random assignment
    const shuffled = [...colors].sort(() => Math.random() - 0.5);

    // Assign colors
    const updates = masters.map((master, idx) => {
      const color = shuffled[idx % shuffled.length];
      return prisma.master.update({
        where: { id: master.id },
        data: { color },
      });
    });

    await Promise.all(updates);

    return NextResponse.json({ success: true, assigned: masters.length });
  } catch (error) {
    console.error('Assign colors error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
