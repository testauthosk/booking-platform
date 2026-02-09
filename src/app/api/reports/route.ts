import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { salonId: true },
    });
    if (!user?.salonId) {
      return NextResponse.json({ error: 'No salon' }, { status: 400 });
    }

    const salonId = user.salonId;
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month'; // week | month | year
    
    // Calculate date range
    const now = new Date();
    let startDate: Date;
    let prevStartDate: Date;
    let prevEndDate: Date;

    if (period === 'week') {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      prevEndDate = new Date(startDate);
      prevStartDate = new Date(startDate);
      prevStartDate.setDate(prevStartDate.getDate() - 7);
    } else if (period === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1);
      prevStartDate = new Date(now.getFullYear() - 1, 0, 1);
      prevEndDate = new Date(now.getFullYear() - 1, 11, 31);
    } else {
      // month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      prevStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      prevEndDate = new Date(now.getFullYear(), now.getMonth(), 0);
    }

    const startStr = startDate.toISOString().split('T')[0];
    const prevStartStr = prevStartDate.toISOString().split('T')[0];
    const prevEndStr = prevEndDate.toISOString().split('T')[0];
    const nowStr = now.toISOString().split('T')[0];

    // Current period bookings
    const currentBookings = await prisma.booking.findMany({
      where: {
        salonId,
        date: { gte: startStr, lte: nowStr },
        status: { not: 'CANCELLED' },
      },
      select: {
        id: true,
        date: true,
        time: true,
        duration: true,
        price: true,
        status: true,
        masterId: true,
        masterName: true,
        serviceName: true,
        clientId: true,
      },
    });

    // Previous period bookings
    const prevBookings = await prisma.booking.findMany({
      where: {
        salonId,
        date: { gte: prevStartStr, lte: prevEndStr },
        status: { not: 'CANCELLED' },
      },
      select: { price: true, id: true },
    });

    // Masters
    const masters = await prisma.master.findMany({
      where: { salonId, isActive: true },
      select: { id: true, name: true, workingHours: true },
    });

    // === Metrics ===
    const totalRevenue = currentBookings.reduce((sum, b) => sum + (b.price || 0), 0);
    const prevRevenue = prevBookings.reduce((sum, b) => sum + (b.price || 0), 0);
    const totalBookings = currentBookings.length;
    const prevTotalBookings = prevBookings.length;
    const completedBookings = currentBookings.filter(b => b.status === 'COMPLETED').length;
    const avgCheck = totalBookings > 0 ? Math.round(totalRevenue / totalBookings) : 0;
    const uniqueClients = new Set(currentBookings.filter(b => b.clientId).map(b => b.clientId)).size;

    // === Revenue by day ===
    const revenueByDay: Record<string, number> = {};
    const bookingsByDay: Record<string, number> = {};
    currentBookings.forEach(b => {
      revenueByDay[b.date] = (revenueByDay[b.date] || 0) + (b.price || 0);
      bookingsByDay[b.date] = (bookingsByDay[b.date] || 0) + 1;
    });

    // Generate all days in range
    const days: { date: string; revenue: number; bookings: number }[] = [];
    const d = new Date(startDate);
    while (d <= now) {
      const ds = d.toISOString().split('T')[0];
      days.push({
        date: ds,
        revenue: revenueByDay[ds] || 0,
        bookings: bookingsByDay[ds] || 0,
      });
      d.setDate(d.getDate() + 1);
    }

    // === Top services ===
    const serviceMap: Record<string, { count: number; revenue: number }> = {};
    currentBookings.forEach(b => {
      const name = b.serviceName || 'Інше';
      if (!serviceMap[name]) serviceMap[name] = { count: 0, revenue: 0 };
      serviceMap[name].count++;
      serviceMap[name].revenue += b.price || 0;
    });
    const topServices = Object.entries(serviceMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // === Master stats ===
    const masterMap: Record<string, { bookings: number; revenue: number; totalMinutes: number }> = {};
    currentBookings.forEach(b => {
      const mid = b.masterId || 'unknown';
      if (!masterMap[mid]) masterMap[mid] = { bookings: 0, revenue: 0, totalMinutes: 0 };
      masterMap[mid].bookings++;
      masterMap[mid].revenue += b.price || 0;
      masterMap[mid].totalMinutes += b.duration || 0;
    });

    // Calculate workload percentage
    const daysInPeriod = Math.max(1, days.length);
    const masterStats = masters.map(m => {
      const stats = masterMap[m.id] || { bookings: 0, revenue: 0, totalMinutes: 0 };
      // Estimate available minutes: 8h/day * working days
      const workingDays = daysInPeriod; // simplified
      const availableMinutes = workingDays * 8 * 60;
      const workload = availableMinutes > 0 ? Math.min(100, Math.round((stats.totalMinutes / availableMinutes) * 100)) : 0;

      return {
        id: m.id,
        name: m.name,
        bookings: stats.bookings,
        revenue: stats.revenue,
        workload,
      };
    }).sort((a, b) => b.revenue - a.revenue);

    // === Revenue change % ===
    const revenueChange = prevRevenue > 0
      ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100)
      : totalRevenue > 0 ? 100 : 0;
    const bookingsChange = prevTotalBookings > 0
      ? Math.round(((totalBookings - prevTotalBookings) / prevTotalBookings) * 100)
      : totalBookings > 0 ? 100 : 0;

    return NextResponse.json({
      period,
      metrics: {
        totalRevenue,
        prevRevenue,
        revenueChange,
        totalBookings,
        prevTotalBookings,
        bookingsChange,
        completedBookings,
        avgCheck,
        uniqueClients,
      },
      chart: days,
      topServices,
      masterStats,
    });
  } catch (error) {
    console.error('Reports error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
