import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// POST - generate impersonation token
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true, salonId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Create a time-limited impersonation token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    // Store in OtpCode as a hack (reuse existing model)
    await prisma.otpCode.create({
      data: {
        phone: `impersonate:${userId}`,
        email: user.email,
        code: token,
        type: 'LOGIN',
        channel: 'EMAIL',
        expiresAt,
      },
    });

    // Log it
    try {
      await prisma.auditLog.create({
        data: {
          salonId: user.salonId || 'system',
          actorType: 'ADMIN',
          actorId: session.user.id,
          actorName: session.user.email || 'Super Admin',
          action: 'UPDATE',
          entityType: 'IMPERSONATE',
          entityId: userId,
          changes: { targetEmail: user.email, targetRole: user.role },
        },
      });
    } catch {}

    return NextResponse.json({
      token,
      user,
      expiresAt: expiresAt.toISOString(),
      note: 'Use /api/auth/signin with credentials to impersonate. Token valid for 15 minutes.',
    });
  } catch (error) {
    console.error('Impersonate error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// GET - list recent impersonation sessions
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const logs = await prisma.auditLog.findMany({
      where: { entityType: 'IMPERSONATE' },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true, actorName: true, entityId: true, changes: true, createdAt: true,
      },
    });

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Impersonate logs error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
