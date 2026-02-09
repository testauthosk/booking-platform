import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/prisma';

// GET - list OTP codes
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter') || 'all'; // all | active | used | expired
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search');

    const now = new Date();

    const where: Record<string, unknown> = {};

    // Filter by status
    if (filter === 'active') {
      where.verified = false;
      where.expiresAt = { gt: now };
    } else if (filter === 'used') {
      where.verified = true;
    } else if (filter === 'expired') {
      where.verified = false;
      where.expiresAt = { lt: now };
    }

    // Search
    if (search) {
      where.OR = [
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { code: { contains: search } },
      ];
    }

    const [otpCodes, total, stats] = await Promise.all([
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
      Promise.all([
        prisma.otpCode.count(),
        prisma.otpCode.count({ where: { verified: false, expiresAt: { gt: now } } }),
        prisma.otpCode.count({ where: { verified: true } }),
        prisma.otpCode.count({ where: { verified: false, expiresAt: { lt: now } } }),
      ]),
    ]);

    return NextResponse.json({
      otpCodes: otpCodes.map((otp) => ({
        ...otp,
        isExpired: otp.expiresAt < now,
        isActive: !otp.verified && otp.expiresAt > now,
      })),
      total,
      page,
      stats: {
        total: stats[0],
        active: stats[1],
        used: stats[2],
        expired: stats[3],
      },
    });
  } catch (error) {
    console.error('Error fetching OTP codes:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// DELETE - cleanup expired OTP codes
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const cleanupExpired = searchParams.get('cleanupExpired') === 'true';

    if (id) {
      // Delete single OTP
      await prisma.otpCode.delete({ where: { id } });
      return NextResponse.json({ success: true, deleted: 1 });
    }

    if (cleanupExpired) {
      // Delete all expired OTP codes
      const result = await prisma.otpCode.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: new Date() } },
            { verified: true },
          ],
        },
      });
      return NextResponse.json({ success: true, deleted: result.count });
    }

    return NextResponse.json({ error: 'Missing id or cleanupExpired' }, { status: 400 });
  } catch (error) {
    console.error('Error deleting OTP:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
