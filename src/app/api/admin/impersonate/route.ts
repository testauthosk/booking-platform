import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

const IMPERSONATE_COOKIE = 'admin-impersonate-original';

// GET - check current impersonation status
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'SUPER_ADMIN') {
      // Check if impersonating
      const cookieStore = await cookies();
      const originalAdmin = cookieStore.get(IMPERSONATE_COOKIE)?.value;
      if (originalAdmin) {
        return NextResponse.json({
          isImpersonating: true,
          originalAdmin: JSON.parse(originalAdmin),
          currentUser: session?.user,
        });
      }
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const cookieStore = await cookies();
    const originalAdmin = cookieStore.get(IMPERSONATE_COOKIE)?.value;

    // Recent impersonation logs
    const logs = await prisma.auditLog.findMany({
      where: { entityType: 'IMPERSONATE' },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, actorName: true, entityId: true, changes: true, createdAt: true },
    });

    return NextResponse.json({
      isImpersonating: !!originalAdmin,
      originalAdmin: originalAdmin ? JSON.parse(originalAdmin) : null,
      logs,
    });
  } catch (error) {
    console.error('Impersonate status error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// POST - start impersonation
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

    // Store original admin info in cookie
    const response = NextResponse.json({
      message: `Увійшли як ${user.email}. Для повернення використайте кнопку "Повернутися".`,
      user,
    });

    response.cookies.set(IMPERSONATE_COOKIE, JSON.stringify({
      id: session.user.id,
      email: session.user.email,
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 3600, // 1 hour max
      path: '/',
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

    return response;
  } catch (error) {
    console.error('Impersonate error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// DELETE - stop impersonation
export async function DELETE() {
  try {
    const cookieStore = await cookies();
    const originalAdmin = cookieStore.get(IMPERSONATE_COOKIE)?.value;

    if (!originalAdmin) {
      return NextResponse.json({ error: 'Not impersonating' }, { status: 400 });
    }

    const admin = JSON.parse(originalAdmin);
    const response = NextResponse.json({
      message: `Повернулись як ${admin.email}`,
      admin,
    });

    response.cookies.delete(IMPERSONATE_COOKIE);
    return response;
  } catch (error) {
    console.error('Stop impersonate error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
