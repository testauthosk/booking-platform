import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Отримати поточний час в Києві
const getKyivTime = () => {
  const now = new Date();
  // Конвертуємо в Київський час
  const kyivTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Kyiv' }));
  return kyivTime;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const masterId = searchParams.get('masterId');
    const requestedDate = searchParams.get('date'); // Optional: specific date YYYY-MM-DD

    if (!masterId) {
      return NextResponse.json({ error: 'masterId required' }, { status: 400 });
    }

    // Get dates in Kyiv timezone
    const now = getKyivTime();
    const todayStr = requestedDate || now.toISOString().split('T')[0]; // Use requested date or today
    
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    // Week range
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekEndStr = weekEnd.toISOString().split('T')[0];

    // Автозавершення: записи що закінчились переводимо в COMPLETED
    // Тільки якщо запитуємо сьогоднішню дату
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTotalMinutes = currentHour * 60 + currentMinute;
    const isRequestingToday = !requestedDate || requestedDate === now.toISOString().split('T')[0];
    
    if (isRequestingToday) {
      // Знаходимо записи які повинні бути завершені
      const pendingBookings = await prisma.booking.findMany({
        where: {
          masterId,
          date: todayStr,
          status: 'CONFIRMED'
        },
        select: { id: true, time: true, timeEnd: true, duration: true }
      });
      
      // Автоматично завершуємо записи час яких пройшов
      for (const booking of pendingBookings) {
        const [h, m] = booking.time.split(':').map(Number);
        const endMinutes = booking.timeEnd 
          ? (() => { const [eh, em] = booking.timeEnd.split(':').map(Number); return eh * 60 + em; })()
          : h * 60 + m + (booking.duration || 60);
        
        // Якщо запис закінчився — помічаємо як виконаний
        if (currentTotalMinutes >= endMinutes) {
          await prisma.booking.update({
            where: { id: booking.id },
            data: { status: 'COMPLETED' }
          });
        }
      }
    }

    // Get today's bookings (оновлені після автозавершення)
    const todayBookings = await prisma.booking.findMany({
      where: {
        masterId,
        date: todayStr,
        status: { not: 'CANCELLED' }
      },
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
        price: true
      }
    });

    // Count tomorrow
    const tomorrowCount = await prisma.booking.count({
      where: {
        masterId,
        date: tomorrowStr,
        status: { not: 'CANCELLED' }
      }
    });

    // Count this week
    const weekCount = await prisma.booking.count({
      where: {
        masterId,
        date: {
          gte: todayStr,
          lte: weekEndStr
        },
        status: { not: 'CANCELLED' }
      }
    });

    // Count unique clients
    const uniqueClients = await prisma.booking.groupBy({
      by: ['clientPhone'],
      where: {
        masterId,
        status: { not: 'CANCELLED' }
      }
    });

    // Find next upcoming booking
    let nextBooking = todayBookings.find(b => {
      const [h, m] = b.time.split(':').map(Number);
      const bookingMinutes = h * 60 + m;
      return bookingMinutes > currentTotalMinutes && b.status !== 'COMPLETED';
    });
    
    // If no upcoming today, check tomorrow
    if (!nextBooking) {
      const tomorrowBookings = await prisma.booking.findFirst({
        where: {
          masterId,
          date: tomorrowStr,
          status: { not: 'CANCELLED' }
        },
        orderBy: { time: 'asc' },
        select: {
          id: true,
          clientName: true,
          serviceName: true,
          time: true,
          timeEnd: true,
          duration: true,
          status: true,
          price: true
        }
      });
      // Don't show tomorrow's as "next" for now
    }

    return NextResponse.json({
      todayCount: todayBookings.length,
      tomorrowCount,
      weekCount,
      totalClients: uniqueClients.length,
      todayBookings,
      nextBooking: nextBooking || null,
      serverTime: now.toISOString() // Для дебагу
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    });
  } catch (error) {
    console.error('Staff dashboard error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
