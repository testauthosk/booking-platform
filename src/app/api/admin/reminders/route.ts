import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';

// GET - reminders stats and history
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status');
    const type = searchParams.get('type');

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Build where clause
    const where: any = {};
    if (status) where.status = status;
    if (type) where.type = type;

    // Get reminders with pagination
    const [reminders, total] = await Promise.all([
      prisma.sentReminder.findMany({
        where,
        orderBy: { sentAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.sentReminder.count({ where }),
    ]);

    // Get booking info for reminders
    const bookingIds = reminders.map(r => r.bookingId);
    const bookings = await prisma.booking.findMany({
      where: { id: { in: bookingIds } },
      select: {
        id: true,
        clientName: true,
        clientPhone: true,
        serviceName: true,
        date: true,
        time: true,
        salon: { select: { name: true } },
      },
    });
    const bookingMap = new Map(bookings.map(b => [b.id, b]));

    const remindersWithBookings = reminders.map(r => ({
      ...r,
      booking: bookingMap.get(r.bookingId) || null,
    }));

    // Stats
    const [
      totalSent,
      sentToday,
      sentWeek,
      sentMonth,
      failed,
      sent24h,
      sent2h,
    ] = await Promise.all([
      prisma.sentReminder.count(),
      prisma.sentReminder.count({ where: { sentAt: { gte: today } } }),
      prisma.sentReminder.count({ where: { sentAt: { gte: weekAgo } } }),
      prisma.sentReminder.count({ where: { sentAt: { gte: monthAgo } } }),
      prisma.sentReminder.count({ where: { status: 'failed' } }),
      prisma.sentReminder.count({ where: { type: '24h', sentAt: { gte: weekAgo } } }),
      prisma.sentReminder.count({ where: { type: '2h', sentAt: { gte: weekAgo } } }),
    ]);

    // Settings across salons
    const settings = await prisma.reminderSettings.findMany({
      select: {
        salonId: true,
        isActive: true,
        reminder24h: true,
        reminder2h: true,
      },
    });

    const activeSettings = settings.filter(s => s.isActive).length;

    // Clients with telegram
    const clientsWithTelegram = await prisma.client.count({
      where: { telegramChatId: { not: null } },
    });

    return NextResponse.json({
      reminders: remindersWithBookings,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      stats: {
        totalSent,
        sentToday,
        sentWeek,
        sentMonth,
        failed,
        sent24h,
        sent2h,
        activeSettings,
        totalSettings: settings.length,
        clientsWithTelegram,
      },
    });
  } catch (error) {
    console.error('Error fetching reminders:', error);
    return NextResponse.json({ error: 'Failed to fetch reminders' }, { status: 500 });
  }
}

// POST - trigger manual reminder send
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Trigger the reminder cron manually
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/reminders/send`, {
      method: 'POST',
      headers: {
        'x-vercel-cron': '1', // Simulate cron trigger
      },
    });

    const result = await res.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error triggering reminders:', error);
    return NextResponse.json({ error: 'Failed to trigger reminders' }, { status: 500 });
  }
}
