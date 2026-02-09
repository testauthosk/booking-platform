import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import prisma from '@/lib/prisma';

const NOTIFY_SELECT = {
  notifyChannels: true,
  notifyReminder24h: true,
  notifyReminder2h: true,
  notifyReminder1h: true,
  notifyAfterVisit: true,
  notifyBirthday: true,
  notifyReturnDays: true,
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { salonId: true },
    });
    if (!user?.salonId) {
      return NextResponse.json({ error: 'No salon' }, { status: 400 });
    }

    const salon = await prisma.salon.findUnique({
      where: { id: user.salonId },
      select: NOTIFY_SELECT,
    });

    return NextResponse.json(salon);
  } catch (error) {
    console.error('GET notifications settings error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { salonId: true, role: true },
    });
    if (!user?.salonId) {
      return NextResponse.json({ error: 'No salon' }, { status: 400 });
    }
    if (user.role !== 'SALON_OWNER' && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const updates: Record<string, unknown> = {};

    const validChannels = ['telegram', 'email', 'sms'];

    if (body.notifyChannels !== undefined) {
      if (!Array.isArray(body.notifyChannels)) {
        return NextResponse.json({ error: 'notifyChannels must be array' }, { status: 400 });
      }
      const filtered = body.notifyChannels.filter((c: string) => validChannels.includes(c));
      updates.notifyChannels = filtered;
    }

    const boolFields = [
      'notifyReminder24h', 'notifyReminder2h', 'notifyReminder1h',
      'notifyAfterVisit', 'notifyBirthday',
    ] as const;

    for (const field of boolFields) {
      if (body[field] !== undefined) {
        updates[field] = Boolean(body[field]);
      }
    }

    if (body.notifyReturnDays !== undefined) {
      const v = Number(body.notifyReturnDays);
      if (isNaN(v) || v < 0 || v > 365) {
        return NextResponse.json({ error: 'notifyReturnDays: 0-365' }, { status: 400 });
      }
      updates.notifyReturnDays = v;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const salon = await prisma.salon.update({
      where: { id: user.salonId },
      data: updates,
      select: NOTIFY_SELECT,
    });

    return NextResponse.json(salon);
  } catch (error) {
    console.error('PUT notifications settings error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
