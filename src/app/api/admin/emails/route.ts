import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/prisma';

// GET - list email OTP codes (since we don't have a separate email log table)
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

    const where: Record<string, unknown> = {
      channel: 'EMAIL',
    };

    if (search) {
      where.email = { contains: search, mode: 'insensitive' };
    }

    const [emails, total] = await Promise.all([
      prisma.otpCode.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { id: true, email: true, name: true } },
        },
      }),
      prisma.otpCode.count({ where }),
    ]);

    // Format as email logs
    const emailLogs = emails.map((otp) => ({
      id: otp.id,
      to: otp.email || otp.user?.email,
      subject: `OTP код: ${otp.type}`,
      type: otp.type,
      status: otp.verified ? 'verified' : otp.expiresAt < new Date() ? 'expired' : 'sent',
      createdAt: otp.createdAt,
      user: otp.user,
    }));

    // Get stats
    const stats = await Promise.all([
      prisma.otpCode.count({ where: { channel: 'EMAIL' } }),
      prisma.otpCode.count({ where: { channel: 'EMAIL', verified: true } }),
      prisma.otpCode.count({ where: { channel: 'EMAIL', verified: false, expiresAt: { lt: new Date() } } }),
    ]);

    return NextResponse.json({
      emails: emailLogs,
      total,
      page,
      stats: {
        total: stats[0],
        verified: stats[1],
        expired: stats[2],
      },
    });
  } catch (error) {
    console.error('Error fetching email logs:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
