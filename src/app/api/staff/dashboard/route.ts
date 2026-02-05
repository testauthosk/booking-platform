import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Отримати поточний час в заданій таймзоні
const getTimeInTimezone = (timezone: string) => {
  const now = new Date();
  const timeInZone = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  return timeInZone;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const masterId = searchParams.get('masterId');
    const requestedDate = searchParams.get('date'); // Optional: specific date YYYY-MM-DD

    if (!masterId) {
      return NextResponse.json({ error: 'masterId required' }, { status: 400 });
    }

    // Отримуємо timezone мастера
    const master = await prisma.master.findUnique({
      where: { id: masterId },
      select: { timezone: true }
    });
    const timezone = master?.timezone || 'Europe/Kiev';

    // Get dates in master's timezone
    const now = getTimeInTimezone(timezone);
    const todayStr = requestedDate || now.toISOString().split('T')[0]; // Use requested date or today
    
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    // Week range (Monday to Sunday of current week)
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Days to Monday
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() + mondayOffset);
    const weekStartStr = weekStart.toISOString().split('T')[0];
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6); // Sunday
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

    // Count this week (Monday to Sunday)
    const weekCount = await prisma.booking.count({
      where: {
        masterId,
        date: {
          gte: weekStartStr,
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
