import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/notifications - список уведомлений
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const salonId = searchParams.get('salonId');
    const recipientId = searchParams.get('recipientId');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!salonId) {
      return NextResponse.json({ error: 'salonId required' }, { status: 400 });
    }

    const notifications = await prisma.notification.findMany({
      where: {
        salonId,
        ...(recipientId && { recipientId }),
        ...(unreadOnly && { isRead: false }),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
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

// POST /api/notifications - создать уведомление
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { salonId, recipientType, recipientId, type, title, message, entityType, entityId } = body;

    if (!salonId || !type || !title || !message) {
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

// PATCH /api/notifications - пометить как прочитанные
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { salonId, ids, markAllRead } = body;

    if (!salonId) {
      return NextResponse.json({ error: 'salonId required' }, { status: 400 });
    }

    if (markAllRead) {
      await prisma.notification.updateMany({
        where: { salonId, isRead: false },
        data: { isRead: true },
      });
    } else if (ids && ids.length > 0) {
      await prisma.notification.updateMany({
        where: { id: { in: ids } },
        data: { isRead: true },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PATCH /api/notifications error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
