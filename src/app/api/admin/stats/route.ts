import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Salons
    const [totalSalons, activeSalons, newSalons] = await Promise.all([
      prisma.salon.count(),
      prisma.salon.count({ where: { isActive: true } }),
      prisma.salon.count({ where: { createdAt: { gte: monthAgo } } }),
    ]);

    // Users
    const [totalUsers, adminUsers, masterUsers] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: { in: ['SALON_OWNER', 'SUPER_ADMIN'] } } }),
      prisma.master.count(),
    ]);

    // Clients
    const [totalClients, clientsWithTelegram, newClients] = await Promise.all([
      prisma.client.count(),
      prisma.client.count({ where: { telegramChatId: { not: null } } }),
      prisma.client.count({ where: { createdAt: { gte: monthAgo } } }),
    ]);

    // Bookings
    const todayStr = todayStart.toISOString().split('T')[0];
    const [todayBookings, weekBookings, monthBookings, completedBookings, cancelledBookings] = await Promise.all([
      prisma.booking.count({ where: { date: todayStr } }),
      prisma.booking.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.booking.count({ where: { createdAt: { gte: monthAgo } } }),
      prisma.booking.count({ where: { status: 'COMPLETED', createdAt: { gte: monthAgo } } }),
      prisma.booking.count({ where: { status: 'CANCELLED', createdAt: { gte: monthAgo } } }),
    ]);

    // Reminders (last 24h)
    const [sent24h, sent2h, failedReminders] = await Promise.all([
      prisma.sentReminder.count({ where: { type: '24h', sentAt: { gte: yesterday } } }),
      prisma.sentReminder.count({ where: { type: '2h', sentAt: { gte: yesterday } } }),
      prisma.sentReminder.count({ where: { status: 'failed', sentAt: { gte: yesterday } } }),
    ]);

    // Inventory
    const products = await prisma.product.findMany({
      select: { quantity: true, costPrice: true, minQuantity: true },
    });
    const totalProducts = products.length;
    const lowStock = products.filter(p => p.quantity <= p.minQuantity).length;
    const totalValue = products.reduce((sum, p) => sum + p.quantity * p.costPrice, 0);

    // System status
    let dbStatus = 'ok';
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = 'error';
    }

    const telegramStatus = process.env.TELEGRAM_BOT_TOKEN ? 'ok' : 'not_configured';

    return NextResponse.json({
      salons: { total: totalSalons, active: activeSalons, new: newSalons },
      users: { total: totalUsers, admins: adminUsers, masters: masterUsers },
      clients: { total: totalClients, withTelegram: clientsWithTelegram, new: newClients },
      bookings: {
        today: todayBookings,
        week: weekBookings,
        month: monthBookings,
        completed: completedBookings,
        cancelled: cancelledBookings,
      },
      reminders: { sent24h, sent2h, failed: failedReminders },
      inventory: { totalProducts, lowStock, totalValue },
      system: {
        dbStatus,
        telegramStatus,
        uptime: process.uptime ? `${Math.floor(process.uptime() / 3600)}h` : '-',
      },
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
