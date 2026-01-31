import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendTelegramMessage, formatBookingNotification } from '@/lib/telegram';

export async function POST(request: NextRequest) {
  try {
    const { bookingId } = await request.json();

    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID required' }, { status: 400 });
    }

    // Get booking details with related data
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        salon: {
          select: { name: true, ownerId: true }
        },
        service: {
          select: { name: true }
        },
        master: {
          select: { name: true }
        }
      }
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Get salon owner's telegram chat ID
    const owner = booking.salon.ownerId ? await prisma.user.findUnique({
      where: { id: booking.salon.ownerId },
      select: { telegramChatId: true, notificationsEnabled: true }
    }) : null;

    if (!owner?.telegramChatId || !owner.notificationsEnabled) {
      return NextResponse.json({
        ok: true,
        message: 'Owner has not enabled notifications'
      });
    }

    // Send notification
    const message = formatBookingNotification({
      clientName: booking.clientName,
      clientPhone: booking.clientPhone,
      serviceName: booking.service?.name || booking.serviceName || 'Не указана',
      masterName: booking.master?.name || booking.masterName,
      date: booking.date,
      time: booking.time,
      duration: booking.duration,
      price: booking.price,
      salonName: booking.salon.name,
    });

    const sent = await sendTelegramMessage({
      chatId: owner.telegramChatId,
      text: message,
    });

    if (sent) {
      // Mark notification as sent
      await prisma.booking.update({
        where: { id: bookingId },
        data: { notificationSent: true }
      });
    }

    return NextResponse.json({ ok: true, sent });
  } catch (error) {
    console.error('Notification error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
