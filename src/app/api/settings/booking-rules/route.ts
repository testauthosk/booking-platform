import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import prisma from '@/lib/prisma';

const BOOKING_RULES_SELECT = {
  minLeadTimeHours: true,
  maxAdvanceDays: true,
  slotStepMinutes: true,
  requireConfirmation: true,
  bookingWarningText: true,
  cancelDeadlineHours: true,
  noShowPenaltyPercent: true,
  maxNoShowsBeforeBlock: true,
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
      select: BOOKING_RULES_SELECT,
    });

    return NextResponse.json(salon);
  } catch (error) {
    console.error('GET booking-rules error:', error);
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

    // Validate
    const updates: Record<string, unknown> = {};

    if (body.minLeadTimeHours !== undefined) {
      const v = Number(body.minLeadTimeHours);
      if (isNaN(v) || v < 0 || v > 168) {
        return NextResponse.json({ error: 'minLeadTimeHours: 0-168' }, { status: 400 });
      }
      updates.minLeadTimeHours = v;
    }

    if (body.maxAdvanceDays !== undefined) {
      const v = Number(body.maxAdvanceDays);
      if (isNaN(v) || v < 1 || v > 365) {
        return NextResponse.json({ error: 'maxAdvanceDays: 1-365' }, { status: 400 });
      }
      updates.maxAdvanceDays = v;
    }

    if (body.slotStepMinutes !== undefined) {
      const v = Number(body.slotStepMinutes);
      if (![10, 15, 20, 30, 60].includes(v)) {
        return NextResponse.json({ error: 'slotStepMinutes: 10|15|20|30|60' }, { status: 400 });
      }
      updates.slotStepMinutes = v;
    }

    if (body.requireConfirmation !== undefined) {
      updates.requireConfirmation = Boolean(body.requireConfirmation);
    }

    if (body.bookingWarningText !== undefined) {
      const t = String(body.bookingWarningText || '').trim();
      if (t.length > 500) {
        return NextResponse.json({ error: 'bookingWarningText: max 500 chars' }, { status: 400 });
      }
      updates.bookingWarningText = t || null;
    }

    if (body.cancelDeadlineHours !== undefined) {
      const v = Number(body.cancelDeadlineHours);
      if (isNaN(v) || v < 0 || v > 72) {
        return NextResponse.json({ error: 'cancelDeadlineHours: 0-72' }, { status: 400 });
      }
      updates.cancelDeadlineHours = v;
    }

    if (body.noShowPenaltyPercent !== undefined) {
      const v = Number(body.noShowPenaltyPercent);
      if (isNaN(v) || v < 0 || v > 100) {
        return NextResponse.json({ error: 'noShowPenaltyPercent: 0-100' }, { status: 400 });
      }
      updates.noShowPenaltyPercent = v;
    }

    if (body.maxNoShowsBeforeBlock !== undefined) {
      const v = Number(body.maxNoShowsBeforeBlock);
      if (isNaN(v) || v < 0 || v > 50) {
        return NextResponse.json({ error: 'maxNoShowsBeforeBlock: 0-50' }, { status: 400 });
      }
      updates.maxNoShowsBeforeBlock = v;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const salon = await prisma.salon.update({
      where: { id: user.salonId },
      data: updates,
      select: BOOKING_RULES_SELECT,
    });

    return NextResponse.json(salon);
  } catch (error) {
    console.error('PUT booking-rules error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
