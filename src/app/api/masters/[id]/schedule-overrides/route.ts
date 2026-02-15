import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import prisma from '@/lib/prisma';

// GET /api/masters/[id]/schedule-overrides?month=YYYY-MM
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: masterId } = await params;
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // YYYY-MM

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: 'month param required (YYYY-MM)' }, { status: 400 });
    }

    // Verify master belongs to user's salon
    const master = await prisma.master.findUnique({
      where: { id: masterId },
      select: { salonId: true },
    });

    if (!master) {
      return NextResponse.json({ error: 'Master not found' }, { status: 404 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { salonId: true, role: true },
    });

    if (user?.role !== 'SUPER_ADMIN' && user?.salonId !== master.salonId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const overrides = await prisma.scheduleOverride.findMany({
      where: {
        masterId,
        date: {
          gte: `${month}-01`,
          lte: `${month}-31`,
        },
      },
      orderBy: { date: 'asc' },
    });

    return NextResponse.json(overrides);
  } catch (error) {
    console.error('Admin schedule-overrides GET error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// POST /api/masters/[id]/schedule-overrides — create/update override (upsert)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: masterId } = await params;
    const body = await request.json();
    const { date, isWorking, start, end, reason } = body;

    // Verify master belongs to user's salon
    const master = await prisma.master.findUnique({
      where: { id: masterId },
      select: { salonId: true },
    });

    if (!master) {
      return NextResponse.json({ error: 'Master not found' }, { status: 404 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { salonId: true, role: true },
    });

    if (user?.role !== 'SUPER_ADMIN' && user?.salonId !== master.salonId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

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
          masterId,
          date,
        },
      },
      create: {
        salonId: master.salonId,
        masterId,
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

    // Audit log
    await prisma.auditLog.create({
      data: {
        salonId: master.salonId,
        actorType: 'user',
        actorId: session.user.id,
        actorName: session.user.name || null,
        action: 'CREATE',
        entityType: 'scheduleOverride',
        entityId: override.id,
        entityName: `${masterId} ${date}`,
        changes: { date, isWorking, start, end, reason },
      },
    }).catch(err => console.error('Audit log write failed:', err));

    return NextResponse.json(override);
  } catch (error) {
    console.error('Admin schedule-overrides POST error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// DELETE /api/masters/[id]/schedule-overrides?id=X
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: masterId } = await params;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    // Verify override exists and belongs to the master
    const override = await prisma.scheduleOverride.findUnique({
      where: { id },
      select: { masterId: true, salonId: true, date: true },
    });

    if (!override || override.masterId !== masterId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Verify user has access
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { salonId: true, role: true },
    });

    if (user?.role !== 'SUPER_ADMIN' && user?.salonId !== override.salonId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.scheduleOverride.delete({ where: { id } });

    // Audit log
    await prisma.auditLog.create({
      data: {
        salonId: override.salonId,
        actorType: 'user',
        actorId: session.user.id,
        actorName: session.user.name || null,
        action: 'DELETE',
        entityType: 'scheduleOverride',
        entityId: id,
        entityName: override.date,
      },
    }).catch(err => console.error('Audit log write failed:', err));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin schedule-overrides DELETE error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
