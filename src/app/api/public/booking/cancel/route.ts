import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyCancelToken } from '@/lib/cancel-token';
import { msUntilBooking } from '@/lib/salon-time';

export async function POST(request: NextRequest) {
  try {
    const { bookingId, token } = await request.json();

    if (!bookingId || !token) {
      return NextResponse.json({ error: 'Невірні параметри' }, { status: 400 });
    }

    // Verify token
    if (!verifyCancelToken(bookingId, token)) {
      return NextResponse.json({ error: 'Невірне посилання' }, { status: 403 });
    }

    // Find booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        status: true,
        date: true,
        time: true,
        clientId: true,
        clientName: true,
        serviceName: true,
        masterName: true,
        price: true,
        salonId: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Запис не знайдено' }, { status: 404 });
    }

    if (booking.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Запис вже скасовано' }, { status: 400 });
    }

    if (booking.status === 'COMPLETED') {
      return NextResponse.json({ error: 'Запис вже завершено' }, { status: 400 });
    }

    // Check cancellation policy — uses salon's cancelDeadlineHours (timezone-aware)
    const salon = await prisma.salon.findUnique({
      where: { id: booking.salonId },
      select: { cancelDeadlineHours: true, ownerId: true, timezone: true },
    });
    const deadlineHours = salon?.cancelDeadlineHours ?? 2;
    const tz = salon?.timezone || 'Europe/Kiev';

    const msUntil = msUntilBooking(booking.date, booking.time, tz);
    const hoursUntil = msUntil / (1000 * 60 * 60);

    if (deadlineHours > 0 && hoursUntil < deadlineHours) {
      return NextResponse.json({
        error: `Скасування можливе не пізніше ніж за ${deadlineHours} год до візиту`,
      }, { status: 400 });
    }

    // Cancel booking
    await prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'CANCELLED' },
    });

    // Decrement client stats
    if (booking.clientId) {
      await prisma.client.update({
        where: { id: booking.clientId },
        data: {
          visitsCount: { decrement: 1 },
          totalSpent: { decrement: booking.price || 0 },
        },
      }).catch(console.error);
    }

    // Notify salon owner
    try {
      if (salon?.ownerId) {
        const owner = await prisma.user.findUnique({
          where: { id: salon.ownerId },
          select: { telegramChatId: true },
        });
        if (owner?.telegramChatId) {
          const { sendMessage } = await import('@/lib/telegram-bot');
          sendMessage(
            owner.telegramChatId,
            `❌ <b>Клієнт скасував запис</b>\n\n` +
            `👤 ${booking.clientName}\n` +
            `💇 ${booking.serviceName}\n` +
            `👨‍💼 ${booking.masterName}\n` +
            `📅 ${booking.date} о ${booking.time}`
          ).catch(console.error);
        }
      }
    } catch {}

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Cancel booking error:', error);
    return NextResponse.json({ error: 'Внутрішня помилка' }, { status: 500 });
  }
}
