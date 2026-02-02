import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// POST /api/invitations/accept - принять приглашение и создать аккаунт
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password, name } = body;

    if (!token || !password) {
      return NextResponse.json({ error: 'Token and password required' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    // Находим приглашение
    const invitation = await prisma.staffInvitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      return NextResponse.json({ error: 'Invalid invitation' }, { status: 404 });
    }

    if (invitation.isUsed) {
      return NextResponse.json({ error: 'Invitation already used' }, { status: 400 });
    }

    if (invitation.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Invitation expired' }, { status: 400 });
    }

    // Хешируем пароль
    const passwordHash = await bcrypt.hash(password, 10);

    // Создаём мастера
    const master = await prisma.master.create({
      data: {
        salonId: invitation.salonId,
        email: invitation.email,
        name: name || invitation.name || invitation.email.split('@')[0],
        role: invitation.role,
        passwordHash,
      },
    });

    // Помечаем приглашение как использованное
    await prisma.staffInvitation.update({
      where: { id: invitation.id },
      data: {
        isUsed: true,
        masterId: master.id,
      },
    });

    // Логируем в AuditLog
    await prisma.auditLog.create({
      data: {
        salonId: invitation.salonId,
        actorType: 'master',
        actorId: master.id,
        actorName: master.name,
        action: 'CREATE',
        entityType: 'master',
        entityId: master.id,
        entityName: master.name,
        changes: { event: 'Master registered via invitation' },
      },
    });

    return NextResponse.json({
      success: true,
      master: {
        id: master.id,
        name: master.name,
        email: master.email,
      },
    });
  } catch (error) {
    console.error('POST /api/invitations/accept error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/invitations/accept?token=xxx - проверить токен
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 });
    }

    const invitation = await prisma.staffInvitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      return NextResponse.json({ valid: false, error: 'Invalid invitation' });
    }

    if (invitation.isUsed) {
      return NextResponse.json({ valid: false, error: 'Invitation already used' });
    }

    if (invitation.expiresAt < new Date()) {
      return NextResponse.json({ valid: false, error: 'Invitation expired' });
    }

    return NextResponse.json({
      valid: true,
      email: invitation.email,
      name: invitation.name,
      role: invitation.role,
    });
  } catch (error) {
    console.error('GET /api/invitations/accept error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
