import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyStaffToken, assertOwnMaster } from '@/lib/staff-auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyStaffToken(request);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const masterId = searchParams.get('masterId');

    const denied = assertOwnMaster(auth, masterId);
    if (denied) return denied;

    const master = await prisma.master.findUnique({
      where: { id: masterId! },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        avatar: true,
        bio: true,
        role: true,
        workingHours: true,
        color: true,
        lunchDuration: true,
        lunchStart: true,
        salon: {
          select: {
            paletteId: true,
          }
        }
      }
    });

    if (!master) {
      return NextResponse.json({ error: 'Master not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...master,
      paletteId: master.salon?.paletteId || 'earth-harmony',
    });
  } catch (error) {
    console.error('Staff profile error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyStaffToken(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { masterId, name, phone, bio, workingHours, color, avatar, lunchDuration, lunchStart } = body;

    const denied = assertOwnMaster(auth, masterId);
    if (denied) return denied;

    const updated = await prisma.master.update({
      where: { id: masterId! },
      data: {
        ...(name && { name }),
        ...(phone !== undefined && { phone }),
        ...(bio !== undefined && { bio }),
        ...(workingHours !== undefined && { workingHours }),
        ...(color !== undefined && { color }),
        ...(avatar !== undefined && { avatar }),
        ...(lunchDuration !== undefined && { lunchDuration }),
        ...(lunchStart !== undefined && { lunchStart })
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
