import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyStaffToken, assertOwnMaster, staffWriteRateLimit } from '@/lib/staff-auth';
import { staffAuditLog } from '@/lib/staff-audit';

// GET /api/staff/schedule-overrides?masterId=X&month=YYYY-MM
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyStaffToken(request);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const masterId = searchParams.get('masterId');
    const month = searchParams.get('month'); // YYYY-MM

    const denied = assertOwnMaster(auth, masterId);
    if (denied) return denied;

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: 'month param required (YYYY-MM)' }, { status: 400 });
    }

    // Get all overrides for the given month
    // Dates are stored as YYYY-MM-DD, so we filter by prefix
    const overrides = await prisma.scheduleOverride.findMany({
      where: {
        masterId: masterId!,
        salonId: auth.salonId,
        date: {
          gte: `${month}-01`,
          lte: `${month}-31`,
        },
      },
      orderBy: { date: 'asc' },
    });

    return NextResponse.json(overrides);
  } catch (error) {
    console.error('Staff schedule-overrides GET error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// POST /api/staff/schedule-overrides — create/update override (upsert)
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyStaffToken(request);
    if (auth instanceof NextResponse) return auth;

    const rateLimited = staffWriteRateLimit(request, auth.masterId);
    if (rateLimited) return rateLimited;

    const body = await request.json();
    const { masterId, date, isWorking, start, end, reason } = body;

    const denied = assertOwnMaster(auth, masterId);
    if (denied) return denied;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'date required (YYYY-MM-DD)' }, { status: 400 });
    }

    if (typeof isWorking !== 'boolean') {
      return NextResponse.json({ error: 'isWorking (boolean) required' }, { status: 400 });
    }

    // Validate time format if provided
    const timeRegex = /^\d{2}:\d{2}$/;
    if (start && !timeRegex.test(start)) {
      return NextResponse.json({ error: 'Invalid start time format (HH:mm)' }, { status: 400 });
    }
    if (end && !timeRegex.test(end)) {
      return NextResponse.json({ error: 'Invalid end time format (HH:mm)' }, { status: 400 });
    }

    // If working with times, validate start < end
    if (isWorking && start && end) {
      const [sh, sm] = start.split(':').map(Number);
      const [eh, em] = end.split(':').map(Number);
      if (sh * 60 + sm >= eh * 60 + em) {
        return NextResponse.json({ error: 'Час закінчення має бути пізніше за час початку' }, { status: 400 });
      }
    }

    const override = await prisma.scheduleOverride.upsert({
      where: {
        masterId_date: {
          masterId: masterId!,
          date,
        },
      },
      create: {
        salonId: auth.salonId,
        masterId: masterId!,
        date,
        isWorking,
        start: isWorking ? (start || null) : null,
        end: isWorking ? (end || null) : null,
        reason: reason || null,
      },
      update: {
        isWorking,
        start: isWorking ? (start || null) : null,
        end: isWorking ? (end || null) : null,
        reason: reason || null,
      },
    });

    staffAuditLog({
      salonId: auth.salonId,
      masterId: auth.masterId,
      action: 'CREATE',
      entityType: 'scheduleOverride',
      entityId: override.id,
      entityName: `${date} ${isWorking ? 'working' : 'day-off'}`,
      changes: { date, isWorking, start, end, reason },
    });

    return NextResponse.json(override);
  } catch (error) {
    console.error('Staff schedule-overrides POST error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// DELETE /api/staff/schedule-overrides?id=X
export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifyStaffToken(request);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    // Verify ownership
    const override = await prisma.scheduleOverride.findUnique({
      where: { id },
      select: { masterId: true, salonId: true, date: true },
    });

    if (!override || override.salonId !== auth.salonId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (override.masterId !== auth.masterId) {
      return NextResponse.json({ error: 'Forbidden — не ваш запис' }, { status: 403 });
    }

    await prisma.scheduleOverride.delete({ where: { id } });

    staffAuditLog({
      salonId: auth.salonId,
      masterId: auth.masterId,
      action: 'DELETE',
      entityType: 'scheduleOverride',
      entityId: id,
      entityName: override.date,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Staff schedule-overrides DELETE error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
