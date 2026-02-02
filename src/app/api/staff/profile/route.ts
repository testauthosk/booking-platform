import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const masterId = searchParams.get('masterId');

    if (!masterId) {
      return NextResponse.json({ error: 'masterId required' }, { status: 400 });
    }

    const master = await prisma.master.findUnique({
      where: { id: masterId },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        avatar: true,
        bio: true,
        role: true,
        workingHours: true,
        color: true
      }
    });

    if (!master) {
      return NextResponse.json({ error: 'Master not found' }, { status: 404 });
    }

    return NextResponse.json(master);
  } catch (error) {
    console.error('Staff profile error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { masterId, name, phone, bio, workingHours, color } = body;

    if (!masterId) {
      return NextResponse.json({ error: 'masterId required' }, { status: 400 });
    }

    const updated = await prisma.master.update({
      where: { id: masterId },
      data: {
        ...(name && { name }),
        ...(phone !== undefined && { phone }),
        ...(bio !== undefined && { bio }),
        ...(workingHours !== undefined && { workingHours }),
        ...(color !== undefined && { color })
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
