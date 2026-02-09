import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/prisma';

// GET - list telegram-related logs from audit log and OTP codes
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search');

    // Get telegram OTP codes
    const otpWhere: Record<string, unknown> = {
      channel: 'TELEGRAM',
    };

    if (search) {
      otpWhere.phone = { contains: search };
    }

    const [otpCodes, sentReminders, total] = await Promise.all([
      prisma.otpCode.findMany({
        where: otpWhere,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: Math.floor(limit / 2),
        include: {
          user: { select: { id: true, email: true, name: true, telegramChatId: true } },
        },
      }),
      // Get sent reminders via telegram
      prisma.sentReminder.findMany({
        where: { channel: 'telegram' },
        orderBy: { sentAt: 'desc' },
        take: Math.floor(limit / 2),
      }),
      prisma.otpCode.count({ where: otpWhere }),
    ]);

    // Format OTP logs
    const otpLogs = otpCodes.map((otp) => ({
      id: otp.id,
      type: 'OTP',
      recipient: otp.user?.telegramChatId || otp.phone,
      recipientName: otp.user?.name || otp.phone,
      message: `OTP код для ${otp.type}: ${otp.code}`,
      status: otp.verified ? 'verified' : 'sent',
      createdAt: otp.createdAt,
    }));

    // Format reminder logs
    const reminderLogs = sentReminders.map((r) => ({
      id: r.id,
      type: 'REMINDER',
      recipient: r.bookingId,
      recipientName: 'Клієнт',
      message: `Нагадування: ${r.type}`,
      status: r.status,
      createdAt: r.sentAt,
      errorMessage: r.errorMessage,
    }));

    // Combine and sort by date
    const logs = [...otpLogs, ...reminderLogs].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Get stats
    const stats = await Promise.all([
      prisma.otpCode.count({ where: { channel: 'TELEGRAM' } }),
      prisma.sentReminder.count({ where: { channel: 'telegram' } }),
      prisma.sentReminder.count({ where: { channel: 'telegram', status: 'error' } }),
    ]);

    return NextResponse.json({
      logs: logs.slice(0, limit),
      total: total + sentReminders.length,
      page,
      stats: {
        otpSent: stats[0],
        remindersSent: stats[1],
        errors: stats[2],
      },
    });
  } catch (error) {
    console.error('Error fetching telegram logs:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
