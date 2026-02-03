import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import prisma from '@/lib/prisma';

// POST - закрити банер міграції
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { salonId: true }
    });

    if (!user?.salonId) {
      return NextResponse.json({ error: 'No salon' }, { status: 400 });
    }

    await prisma.salon.update({
      where: { id: user.salonId },
      data: { migrationDismissed: true }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Migration dismiss error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
