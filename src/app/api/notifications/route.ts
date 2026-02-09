import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';

async function getAuthSalonId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { salonId: true },
  });
  return user?.salonId || null;
}

// GET /api/notifications
export async function GET(request: NextRequest) {
  try {
    const salonId = await getAuthSalonId();
    if (!salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const recipientId = searchParams.get('recipientId');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const limit = parseInt(searchParams.get('limit') || '20');

    const notifications = await prisma.notification.findMany({
      where: {
        salonId,
        ...(recipientId && { recipientId }),
        ...(unreadOnly && { isRead: false }),
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100),
    });

    const unreadCount = await prisma.notification.count({
      where: {
        salonId,
        ...(recipientId && { recipientId }),
        isRead: false,
      },
    });

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    console.error('GET /api/notifications error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/notifications — internal only (called from server-side code)
export async function POST(request: NextRequest) {
  try {
    const salonId = await getAuthSalonId();
    if (!salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { recipientType, recipientId, type, title, message, entityType, entityId } = body;

    if (!type || !title || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const notification = await prisma.notification.create({
      data: {
        salonId,
        recipientType: recipientType || 'admin',
        recipientId,
        type,
        title,
        message,
        entityType,
        entityId,
      },
    });

    return NextResponse.json(notification);
  } catch (error) {
    console.error('POST /api/notifications error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/notifications — mark as read
export async function PATCH(request: NextRequest) {
  try {
    const salonId = await getAuthSalonId();
    if (!salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { ids, markAllRead } = body;

    if (markAllRead) {
      await prisma.notification.updateMany({
        where: { salonId, isRead: false },
        data: { isRead: true },
      });
    } else if (ids && ids.length > 0) {
      // Verify notifications belong to this salon
      await prisma.notification.updateMany({
        where: { id: { in: ids }, salonId },
        data: { isRead: true },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PATCH /api/notifications error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
