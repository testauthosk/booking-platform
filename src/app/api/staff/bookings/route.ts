import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyStaffToken, assertSameSalonMaster, staffWriteRateLimit } from '@/lib/staff-auth';
import { staffAuditLog } from '@/lib/staff-audit';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyStaffToken(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { masterId, salonId, serviceId, clientName, clientPhone, date, time, duration, price, serviceName, notifyAdmin, blockReason } = body;

    const denied = await assertSameSalonMaster(auth, masterId);
    if (denied) return denied;

    const rateLimit = staffWriteRateLimit(request, auth.masterId);
    if (rateLimit) return rateLimit;

    if (!clientName || !clientPhone || !date || !time) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'Невірний формат дати (YYYY-MM-DD)' }, { status: 400 });
    }
    // Validate time format (HH:mm)
    if (!/^\d{2}:\d{2}$/.test(time)) {
      return NextResponse.json({ error: 'Невірний формат часу (HH:mm)' }, { status: 400 });
    }
    // Validate date is real
    const bookingDateTime = new Date(`${date}T${time}:00`);
    if (isNaN(bookingDateTime.getTime())) {
      return NextResponse.json({ error: 'Невалідна дата або час' }, { status: 400 });
    }

    // Validate time range
    const [vH, vM] = time.split(':').map(Number);
    if (vH < 0 || vH > 23 || vM < 0 || vM > 59) {
      return NextResponse.json({ error: 'Час поза допустимим діапазоном' }, { status: 400 });
    }

    // Validate duration
    if (duration !== undefined && (typeof duration !== 'number' || duration < 5 || duration > 480)) {
      return NextResponse.json({ error: 'Тривалість має бути від 5 до 480 хвилин' }, { status: 400 });
    }

    // Check if booking is in the past
    const now = new Date();
    if (bookingDateTime < now) {
      return NextResponse.json({ 
        error: 'Неможливо створити запис на минулий час' 
      }, { status: 400 });
    }

    // Calculate timeEnd
    const [hours, minutes] = time.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + (duration || 60);
    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;
    const timeEnd = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;

    // Check for overlapping bookings
    const existingBookings = await prisma.booking.findMany({
      where: {
        masterId,
        date,
        status: { not: 'CANCELLED' }
      },
      select: { time: true, timeEnd: true, duration: true }
    });

    // Check if new booking overlaps with any existing booking
    for (const existing of existingBookings) {
      const [exH, exM] = existing.time.split(':').map(Number);
      const exStart = exH * 60 + exM;
      // Use timeEnd if available, otherwise fallback to time + duration
      const exEnd = existing.timeEnd
        ? (() => { const [eh, em] = existing.timeEnd.split(':').map(Number); return eh * 60 + em; })()
        : exStart + existing.duration;
      
      // Check overlap: new booking starts before existing ends AND new booking ends after existing starts
      if (startMinutes < exEnd && endMinutes > exStart) {
        return NextResponse.json({ 
          error: 'На цей час вже є запис', 
          overlappingTime: existing.time 
        }, { status: 409 });
      }
    }

    // Check overlap with time blocks
    const existingTimeBlocks = await prisma.timeBlock.findMany({
      where: { masterId, date },
      select: { startTime: true, endTime: true, title: true }
    });

    for (const block of existingTimeBlocks) {
      const [bH, bM] = block.startTime.split(':').map(Number);
      const [beH, beM] = block.endTime.split(':').map(Number);
      const bStart = bH * 60 + bM;
      const bEnd = beH * 60 + beM;

      if (startMinutes < bEnd && endMinutes > bStart) {
        return NextResponse.json({
          error: `Цей час заблоковано: ${block.title || 'Перерва'} (${block.startTime}–${block.endTime})`,
        }, { status: 409 });
      }
    }

    // Get master info
    const master = await prisma.master.findUnique({
      where: { id: masterId },
      select: { name: true, salonId: true }
    });

    if (!master) {
      return NextResponse.json({ error: 'Master not found' }, { status: 404 });
    }

    // Always use master's salonId — never trust client-supplied salonId
    const finalSalonId = master.salonId;

    // Шукаємо існуючого клієнта за телефоном у цьому салоні
    let clientId: string | null = null;
    if (clientPhone && clientPhone !== '-') {
      const existingClient = await prisma.client.findFirst({
        where: { phone: clientPhone, salonId: finalSalonId },
      });
      if (existingClient) {
        clientId = existingClient.id;
      } else {
        // Створюємо нового клієнта
        const newClient = await prisma.client.create({
          data: {
            name: clientName,
            phone: clientPhone,
            salonId: finalSalonId,
          },
        });
        clientId = newClient.id;
      }
    }

    const booking = await prisma.booking.create({
      data: {
        salonId: finalSalonId,
        masterId,
        serviceId: serviceId || null,
        clientId,
        clientName,
        clientPhone,
        clientEmail: null,
        serviceName: serviceName || 'Запис',
        masterName: master.name,
        date,
        time,
        timeEnd,
        duration: duration || 60,
        price: price || 0,
        status: 'CONFIRMED'
      }
    });

    // Audit log
    staffAuditLog({
      salonId: finalSalonId,
      masterId,
      masterName: master.name,
      action: 'CREATE',
      entityType: 'booking',
      entityId: booking.id,
      entityName: `${clientName} — ${serviceName || 'Запис'}`,
      changes: { date, time, duration, price },
    });

    // Якщо треба повідомити адміна (термінове закриття)
    if (notifyAdmin && blockReason === 'end_of_day') {
      try {
        // Знайти адмінів/власників салону
        const admins = await prisma.user.findMany({
          where: {
            salonId: finalSalonId,
            role: { in: ['SALON_OWNER', 'SUPER_ADMIN'] }
          },
          select: { telegramChatId: true, name: true }
        });

        // Відправити Telegram повідомлення кожному адміну
        const baseUrl = request.nextUrl.origin;
        for (const admin of admins) {
          if (admin.telegramChatId) {
            const message = `⚠️ *Термінове закриття*\n\nМайстер *${master.name}* закрив запис до кінця робочого дня.\n\n📅 Дата: ${date}\n⏰ Час: ${time} — ${timeEnd}`;
            
            fetch(`${baseUrl}/api/telegram/send`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chatId: admin.telegramChatId,
                message,
                parseMode: 'Markdown'
              })
            }).catch(console.error);
          }
        }
      } catch (notifyError) {
        console.error('Failed to notify admins:', notifyError);
        // Не блокуємо створення запису через помилку нотифікації
      }
    }

    return NextResponse.json(booking);
  } catch (error) {
    console.error('Create booking error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyStaffToken(request);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const masterId = searchParams.get('masterId');
    const date = searchParams.get('date');

    const denied = await assertSameSalonMaster(auth, masterId);
    if (denied) return denied;

    const where: Record<string, unknown> = {
      masterId,
      status: { not: 'CANCELLED' }
    };

    if (date) {
      where.date = date;
    }

    const bookings = await prisma.booking.findMany({
      where,
      orderBy: { time: 'asc' },
      select: {
        id: true,
        clientName: true,
        clientPhone: true,
        serviceName: true,
        time: true,
        timeEnd: true,
        duration: true,
        status: true,
        price: true,
        date: true
      }
    });

    return NextResponse.json(bookings);
  } catch (error) {
    console.error('Staff bookings error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// PUT - Update booking (time, duration, status, masterId for transfer)
export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyStaffToken(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { bookingId, time, duration, status, masterId, masterName, serviceId, serviceName, price } = body;

    if (!bookingId) {
      return NextResponse.json({ error: 'bookingId required' }, { status: 400 });
    }

    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Перевіряємо що booking з того ж салону
    if (booking.salonId !== auth.salonId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    
    if (time) updateData.time = time;
    if (duration) updateData.duration = duration;
    if (status) updateData.status = status;
    if (masterId) updateData.masterId = masterId;
    if (masterName) updateData.masterName = masterName;
    if (serviceId) updateData.serviceId = serviceId;
    if (serviceName) updateData.serviceName = serviceName;
    if (price !== undefined) updateData.price = price;

    // Recalculate timeEnd if time or duration changed
    const newTime = time || booking.time;
    const newDuration = duration || booking.duration;
    const [hours, minutes] = newTime.split(':').map(Number);
    const newStartMinutes = hours * 60 + minutes;
    const newEndMinutes = newStartMinutes + newDuration;
    const endHours = Math.floor(newEndMinutes / 60);
    const endMins = newEndMinutes % 60;
    updateData.timeEnd = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;

    // Overlap check — if time or duration changed
    if (time || duration) {
      const targetMasterId = (masterId as string) || booking.masterId;

      // Check against other bookings
      const existingBookings = await prisma.booking.findMany({
        where: {
          masterId: targetMasterId,
          date: booking.date,
          status: { not: 'CANCELLED' },
          id: { not: bookingId },
        },
        select: { time: true, timeEnd: true, duration: true }
      });

      for (const existing of existingBookings) {
        const [exH, exM] = existing.time.split(':').map(Number);
        const exStart = exH * 60 + exM;
        const exEnd = existing.timeEnd
          ? (() => { const [eh, em] = existing.timeEnd.split(':').map(Number); return eh * 60 + em; })()
          : exStart + existing.duration;

        if (newStartMinutes < exEnd && newEndMinutes > exStart) {
          return NextResponse.json({
            error: 'На цей час вже є запис',
            overlappingTime: existing.time
          }, { status: 409 });
        }
      }

      // Check against time blocks
      const existingTimeBlocks = await prisma.timeBlock.findMany({
        where: { masterId: targetMasterId, date: booking.date },
        select: { startTime: true, endTime: true, title: true }
      });

      for (const block of existingTimeBlocks) {
        const [bH, bM] = block.startTime.split(':').map(Number);
        const [beH, beM] = block.endTime.split(':').map(Number);
        const bStart = bH * 60 + bM;
        const bEnd = beH * 60 + beM;

        if (newStartMinutes < bEnd && newEndMinutes > bStart) {
          return NextResponse.json({
            error: `Цей час заблоковано: ${block.title || 'Перерва'} (${block.startTime}–${block.endTime})`,
          }, { status: 409 });
        }
      }
    }

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: updateData
    });

    staffAuditLog({
      salonId: booking.salonId,
      masterId: auth.masterId,
      action: 'UPDATE',
      entityType: 'booking',
      entityId: bookingId,
      entityName: booking.clientName,
      changes: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update booking error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// PATCH - Update booking status (NO_SHOW, CANCELLED, COMPLETED)
export async function PATCH(request: NextRequest) {
  try {
    const auth = await verifyStaffToken(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { bookingId, status } = body;

    if (!bookingId || !status) {
      return NextResponse.json({ error: 'bookingId and status required' }, { status: 400 });
    }

    if (!['NO_SHOW', 'CANCELLED', 'COMPLETED', 'CONFIRMED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Перевіряємо що booking з того ж салону
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking || booking.salonId !== auth.salonId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: { status }
    });

    staffAuditLog({
      salonId: booking.salonId,
      masterId: auth.masterId,
      action: 'UPDATE',
      entityType: 'booking',
      entityId: bookingId,
      entityName: booking.clientName,
      changes: { status, previousStatus: booking.status },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update booking status error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
