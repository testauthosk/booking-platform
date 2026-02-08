import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyStaffToken, assertOwnMaster } from '@/lib/staff-auth';
import { staffAuditLog } from '@/lib/staff-audit';

// GET /api/staff/time-blocks — отримати блоки мастера
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyStaffToken(request);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const masterId = searchParams.get('masterId');
    const date = searchParams.get('date');

    const denied = assertOwnMaster(auth, masterId);
    if (denied) return denied;

    const where: Record<string, unknown> = {
      masterId,
      salonId: auth.salonId,
    };
    if (date) where.date = date;

    const timeBlocks = await prisma.timeBlock.findMany({
      where,
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    return NextResponse.json(timeBlocks);
  } catch (error) {
    console.error('Staff time-blocks GET error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// POST /api/staff/time-blocks — створити блок часу
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyStaffToken(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { masterId, date, startTime, endTime, title, type, notifyAdmin } = body;

    const denied = assertOwnMaster(auth, masterId);
    if (denied) return denied;

    if (!date || !startTime || !endTime) {
      return NextResponse.json({ error: 'date, startTime, endTime required' }, { status: 400 });
    }

    // Validate time range
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (endMinutes <= startMinutes) {
      return NextResponse.json({ error: 'Час закінчення має бути пізніше за час початку' }, { status: 400 });
    }

    // Check overlap with existing bookings
    const existingBookings = await prisma.booking.findMany({
      where: {
        masterId,
        date,
        status: { not: 'CANCELLED' },
      },
      select: { time: true, timeEnd: true, duration: true, clientName: true }
    });

    for (const booking of existingBookings) {
      const [bH, bM] = booking.time.split(':').map(Number);
      const bStart = bH * 60 + bM;
      const bEnd = booking.timeEnd
        ? (() => { const [eh, em] = booking.timeEnd.split(':').map(Number); return eh * 60 + em; })()
        : bStart + booking.duration;

      if (startMinutes < bEnd && endMinutes > bStart) {
        return NextResponse.json({
          error: `Перетинається з записом о ${booking.time} (${booking.clientName})`,
        }, { status: 409 });
      }
    }

    // Check overlap with existing time blocks
    const existingBlocks = await prisma.timeBlock.findMany({
      where: { masterId, date },
      select: { startTime: true, endTime: true, title: true }
    });

    for (const block of existingBlocks) {
      const [bH, bM] = block.startTime.split(':').map(Number);
      const [beH, beM] = block.endTime.split(':').map(Number);
      const bStart = bH * 60 + bM;
      const bEnd = beH * 60 + beM;

      if (startMinutes < bEnd && endMinutes > bStart) {
        return NextResponse.json({
          error: `Перетинається з блоком "${block.title || 'Перерва'}" (${block.startTime}–${block.endTime})`,
        }, { status: 409 });
      }
    }

    // Determine block type
    let blockType: 'BREAK' | 'LUNCH' | 'DAY_OFF' | 'OTHER' = 'BREAK';
    const blockTitle = title || 'Перерва';
    if (type) {
      blockType = type;
    } else if (title?.toLowerCase().includes('обід') || title?.toLowerCase().includes('lunch')) {
      blockType = 'LUNCH';
    }

    // Check if full day
    const master = await prisma.master.findUnique({
      where: { id: masterId },
      select: { name: true, workingHours: true, salonId: true }
    });

    const timeBlock = await prisma.timeBlock.create({
      data: {
        salonId: auth.salonId,
        masterId,
        date,
        startTime,
        endTime,
        title: blockTitle,
        type: blockType,
        isAllDay: false,
      },
    });

    staffAuditLog({
      salonId: auth.salonId,
      masterId,
      action: 'CREATE',
      entityType: 'timeBlock',
      entityId: timeBlock.id,
      entityName: blockTitle,
      changes: { date, startTime, endTime, type: blockType },
    });

    // Notify admin if requested (emergency close)
    if (notifyAdmin && master) {
      try {
        const admins = await prisma.user.findMany({
          where: {
            salonId: master.salonId,
            role: { in: ['SALON_OWNER', 'SUPER_ADMIN'] }
          },
          select: { telegramChatId: true }
        });

        for (const admin of admins) {
          if (admin.telegramChatId) {
            const message = `⚠️ *Термінове закриття*\n\nМайстер *${master.name}* заблокував час.\n\n📅 Дата: ${date}\n⏰ Час: ${startTime} — ${endTime}\n📝 ${blockTitle}`;

            // Fire-and-forget notification
            fetch(`${request.nextUrl.origin}/api/telegram/send`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chatId: admin.telegramChatId,
                message,
                parseMode: 'Markdown'
              })
            }).catch(() => {});
          }
        }
      } catch {
        // Don't block on notification failure
      }
    }

    return NextResponse.json(timeBlock);
  } catch (error) {
    console.error('Staff time-blocks POST error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// DELETE /api/staff/time-blocks — видалити блок
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
    const block = await prisma.timeBlock.findUnique({
      where: { id },
      select: { masterId: true, salonId: true }
    });

    if (!block || block.salonId !== auth.salonId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (block.masterId !== auth.masterId) {
      return NextResponse.json({ error: 'Forbidden — не ваш блок' }, { status: 403 });
    }

    await prisma.timeBlock.delete({ where: { id } });

    staffAuditLog({
      salonId: block.salonId,
      masterId: auth.masterId,
      action: 'DELETE',
      entityType: 'timeBlock',
      entityId: id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Staff time-blocks DELETE error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
