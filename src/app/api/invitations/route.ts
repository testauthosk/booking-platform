import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/invitations - список приглашений
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const salonId = searchParams.get('salonId');

    if (!salonId) {
      return NextResponse.json({ error: 'salonId required' }, { status: 400 });
    }

    const invitations = await prisma.staffInvitation.findMany({
      where: { salonId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(invitations);
  } catch (error) {
    console.error('GET /api/invitations error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/invitations - создать приглашение
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { salonId, email, name, role } = body;

    if (!salonId || !email) {
      return NextResponse.json({ error: 'salonId and email required' }, { status: 400 });
    }

    // Проверяем нет ли уже активного приглашения
    const existing = await prisma.staffInvitation.findFirst({
      where: {
        salonId,
        email,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (existing) {
      return NextResponse.json({ error: 'Active invitation already exists' }, { status: 400 });
    }

    // Проверяем нет ли уже мастера с таким email
    const existingMaster = await prisma.master.findFirst({
      where: { salonId, email },
    });

    if (existingMaster) {
      return NextResponse.json({ error: 'Master with this email already exists' }, { status: 400 });
    }

    // Создаём приглашение (действует 7 дней)
    const invitation = await prisma.staffInvitation.create({
      data: {
        salonId,
        email,
        name,
        role,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return NextResponse.json(invitation);
  } catch (error) {
    console.error('POST /api/invitations error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
