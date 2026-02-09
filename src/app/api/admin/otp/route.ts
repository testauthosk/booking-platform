import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all';
    const search = searchParams.get('search') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);

    const now = new Date();
    const where: Record<string, unknown> = {};

    if (filter === 'active') { where.verified = false; where.expiresAt = { gte: now }; }
    else if (filter === 'verified') { where.verified = true; }
    else if (filter === 'expired') { where.expiresAt = { lt: now }; where.verified = false; }

    if (search) {
      where.OR = [
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
        { code: { contains: search } },
      ];
    }

    const [otps, total] = await Promise.all([
      prisma.otpCode.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
        select: {
          id: true, phone: true, email: true, code: true, type: true,
          channel: true, verified: true, attempts: true, expiresAt: true, createdAt: true,
        },
      }),
      prisma.otpCode.count({ where }),
    ]);

    return NextResponse.json({ otps, total, page, limit });
  } catch (error) {
    console.error('Admin OTP error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await prisma.otpCode.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });

    return NextResponse.json({ deleted: result.count });
  } catch (error) {
    console.error('Admin OTP cleanup error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
