import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import prisma from '@/lib/prisma';

// PUT update salon
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { salonId: true, role: true }
    });

    if (!user?.salonId) {
      return NextResponse.json({ error: 'No salon' }, { status: 400 });
    }

    const body = await request.json();
    const { 
      name, 
      description, 
      phone, 
      email, 
      address, 
      shortAddress,
      workingHours,
      logo,
      photos,
    } = body;

    const salon = await prisma.salon.update({
      where: { id: user.salonId },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
        ...(address !== undefined && { address }),
        ...(shortAddress !== undefined && { shortAddress }),
        ...(workingHours !== undefined && { workingHours }),
        ...(logo !== undefined && { logo }),
        ...(photos !== undefined && { photos }),
      }
    });

    return NextResponse.json(salon);
  } catch (error) {
    console.error('Salon update error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
