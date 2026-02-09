import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { checkRateLimit } from '@/lib/rate-limit';

// POST /api/public/booking — публічне бронювання (без авторизації)
export async function POST(request: NextRequest) {
  try {
    // Rate limit: 10 bookings per hour per IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rl = checkRateLimit(`public-booking:${ip}`, { maxAttempts: 10, windowMs: 60 * 60 * 1000 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Забагато запитів. Спробуйте через ${Math.ceil(rl.resetIn / 60)} хв` },
        { status: 429 }
      );
    }

    const body = await request.json();
    const {
      salonId,
      masterId,
      serviceId,
      clientName,
      clientPhone,
      date,
      time,
      duration,
      notes,
      clientEmail,
    } = body;

    // === Validation ===
    if (!salonId || !clientName || !clientPhone || !date || !time) {
      return NextResponse.json({ error: 'Заповніть усі обовʼязкові поля' }, { status: 400 });
    }

    // Name: 2-100 chars, no HTML
    const trimmedName = String(clientName).trim();
    if (trimmedName.length < 2 || trimmedName.length > 100) {
      return NextResponse.json({ error: 'Імʼя має бути від 2 до 100 символів' }, { status: 400 });
    }
    if (/<[^>]*>/.test(trimmedName)) {
      return NextResponse.json({ error: 'Некоректне імʼя' }, { status: 400 });
    }

    // Phone: Ukrainian format
    const cleanPhone = String(clientPhone).replace(/[\s\-\(\)]/g, '');
    if (!/^\+380\d{9}$/.test(cleanPhone)) {
      return NextResponse.json({ error: 'Невірний формат телефону (+380XXXXXXXXX)' }, { status: 400 });
    }

    // Date: YYYY-MM-DD, not in the past
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'Невірний формат дати' }, { status: 400 });
    }
    const bookingDate = new Date(`${date}T${time}:00`);
    const now = new Date();
    if (bookingDate < now) {
      return NextResponse.json({ error: 'Неможливо створити запис на минулий час' }, { status: 400 });
    }
    // Max 60 days ahead
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 60);
    if (bookingDate > maxDate) {
      return NextResponse.json({ error: 'Бронювання можливе максимум на 60 днів вперед' }, { status: 400 });
    }

    // Time: HH:MM
    if (!/^\d{2}:\d{2}$/.test(time)) {
      return NextResponse.json({ error: 'Невірний формат часу' }, { status: 400 });
    }

    // Duration: 15-480 min
    const dur = duration ? Math.min(Math.max(parseInt(String(duration), 10) || 60, 15), 480) : 60;

    // === Verify salon exists and is active ===
    const salon = await prisma.salon.findUnique({
      where: { id: salonId },
      select: { id: true, name: true, isActive: true, ownerId: true, bufferTime: true, address: true, phone: true },
    });
    if (!salon || !salon.isActive) {
      return NextResponse.json({ error: 'Салон не знайдено' }, { status: 404 });
    }

    // === Verify masterId belongs to this salon ===
    let masterName = 'Будь-який майстер';
    let resolvedMasterId = masterId || null;

    if (resolvedMasterId) {
      const master = await prisma.master.findUnique({
        where: { id: resolvedMasterId },
        select: { salonId: true, name: true, isActive: true },
      });
      if (!master || master.salonId !== salonId || !master.isActive) {
        return NextResponse.json({ error: 'Майстер не знайдено' }, { status: 400 });
      }
      masterName = master.name;
    }

    // === Verify serviceId belongs to this salon ===
    let serviceName = 'Послуга';
    let price = 0;
    let resolvedServiceId = serviceId || null;

    if (resolvedServiceId) {
      const service = await prisma.service.findUnique({
        where: { id: resolvedServiceId },
        select: { salonId: true, name: true, price: true, isActive: true },
      });
      if (!service || service.salonId !== salonId || !service.isActive) {
        return NextResponse.json({ error: 'Послугу не знайдено' }, { status: 400 });
      }
      serviceName = service.name;
      price = service.price;
    }

    // === Overlap check ===
    if (resolvedMasterId) {
      const [startH, startM] = time.split(':').map(Number);
      const startMin = startH * 60 + startM;
      const endMin = startMin + dur;

      // Check bookings
      const existingBookings = await prisma.booking.findMany({
        where: {
          salonId,
          masterId: resolvedMasterId,
          date,
          status: { not: 'CANCELLED' },
        },
        select: { time: true, timeEnd: true, duration: true },
      });

      for (const b of existingBookings) {
        const [bh, bm] = b.time.split(':').map(Number);
        const bStart = bh * 60 + bm;
        const bEnd = b.timeEnd
          ? (() => { const [eh, em] = b.timeEnd.split(':').map(Number); return eh * 60 + em; })()
          : bStart + (b.duration || 60);
        if (startMin < bEnd + (salon.bufferTime || 0) && endMin > bStart) {
          return NextResponse.json({ error: 'Цей час вже зайнятий' }, { status: 409 });
        }
      }

      // Check time blocks
      const blocks = await prisma.timeBlock.findMany({
        where: { masterId: resolvedMasterId, date },
        select: { startTime: true, endTime: true },
      });
      for (const tb of blocks) {
        const [th, tm] = tb.startTime.split(':').map(Number);
        const [teh, tem] = tb.endTime.split(':').map(Number);
        if (startMin < teh * 60 + tem && endMin > th * 60 + tm) {
          return NextResponse.json({ error: 'Цей час заблоковано' }, { status: 409 });
        }
      }
    }

    // === Calculate timeEnd ===
    const [h, m] = time.split(':').map(Number);
    const endMinutes = h * 60 + m + dur;
    const timeEnd = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;

    // === Find or create client ===
    let client = await prisma.client.findFirst({
      where: { phone: cleanPhone, salonId },
    });

    if (!client) {
      client = await prisma.client.create({
        data: {
          salonId,
          name: trimmedName,
          phone: cleanPhone,
          ...(clientEmail && typeof clientEmail === 'string' && clientEmail.includes('@')
            ? { email: clientEmail.trim().toLowerCase() }
            : {}),
        },
      });
    } else if (clientEmail && !client.email && typeof clientEmail === 'string' && clientEmail.includes('@')) {
      // Update existing client with email if they didn't have one
      client = await prisma.client.update({
        where: { id: client.id },
        data: { email: clientEmail.trim().toLowerCase() },
      });
    }

    // === Create booking ===
    const booking = await prisma.booking.create({
      data: {
        salonId,
        clientId: client.id,
        masterId: resolvedMasterId,
        serviceId: resolvedServiceId,
        clientName: trimmedName,
        clientPhone: cleanPhone,
        serviceName,
        masterName,
        date,
        time,
        timeEnd,
        duration: dur,
        price,
        notes: notes ? String(notes).substring(0, 500) : null,
        status: 'CONFIRMED',
      },
    });

    // Update client stats
    await prisma.client.update({
      where: { id: client.id },
      data: {
        visitsCount: { increment: 1 },
        lastVisit: new Date(),
      },
    }).catch(console.error);

    // Notify salon owner via Telegram (fire-and-forget)
    if (salon.ownerId) {
      try {
        const owner = await prisma.user.findUnique({
          where: { id: salon.ownerId },
          select: { telegramChatId: true },
        });
        if (owner?.telegramChatId) {
          const { notifySalonOwner } = await import('@/lib/telegram');
          notifySalonOwner(owner.telegramChatId, {
            clientName: trimmedName,
            clientPhone: cleanPhone,
            serviceName,
            masterName,
            date,
            time,
            duration: dur,
            price,
            salonName: salon.name,
          }).catch(console.error);
        }
      } catch {}
    }

    // Send confirmation email to client (fire-and-forget)
    if (client.email || clientEmail) {
      const { sendBookingConfirmation } = await import('@/lib/email');
      sendBookingConfirmation({
        clientName: trimmedName,
        clientEmail: client.email || clientEmail,
        salonName: salon.name,
        salonAddress: salon.address || undefined,
        salonPhone: salon.phone || undefined,
        serviceName,
        masterName,
        date,
        time,
        duration: dur,
        price,
      }).catch(console.error);
    }

    return NextResponse.json({
      id: booking.id,
      date: booking.date,
      time: booking.time,
      timeEnd: booking.timeEnd,
      serviceName: booking.serviceName,
      masterName: booking.masterName,
    }, { status: 201 });
  } catch (error) {
    console.error('Public booking error:', error);
    return NextResponse.json({ error: 'Внутрішня помилка' }, { status: 500 });
  }
}
