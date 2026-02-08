import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// Дефолтний графік роботи (Пн-Пт 9:00-18:00)
const DEFAULT_WORKING_HOURS = {
  monday: { start: '09:00', end: '18:00', enabled: true },
  tuesday: { start: '09:00', end: '18:00', enabled: true },
  wednesday: { start: '09:00', end: '18:00', enabled: true },
  thursday: { start: '09:00', end: '18:00', enabled: true },
  friday: { start: '09:00', end: '18:00', enabled: true },
  saturday: { start: '10:00', end: '16:00', enabled: false },
  sunday: { start: '10:00', end: '16:00', enabled: false },
};

// POST /api/invitations/accept - прийняти запрошення і створити акаунт
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

    // Знаходимо запрошення
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

    // Хешуємо пароль
    const passwordHash = await bcrypt.hash(password, 10);

    // Отримуємо timezone і кількість мастерів з салону
    const salon = await prisma.salon.findUnique({
      where: { id: invitation.salonId },
      select: { timezone: true }
    });

    const masterCount = await prisma.master.count({
      where: { salonId: invitation.salonId },
    });

    // Отримуємо послуги салону до транзакції
    const salonServices = await prisma.service.findMany({
      where: { salonId: invitation.salonId, isActive: true },
      select: { id: true },
    });

    // Всё в одній транзакції: master + services + invitation update + audit
    const master = await prisma.$transaction(async (tx) => {
      // Створюємо мастера
      const newMaster = await tx.master.create({
        data: {
          salonId: invitation.salonId,
          email: invitation.email,
          name: name || invitation.name || invitation.email.split('@')[0],
          role: invitation.role,
          passwordHash,
          timezone: salon?.timezone || 'Europe/Kiev',
          sortOrder: masterCount, // наступний порядковий номер
          workingHours: DEFAULT_WORKING_HOURS,
        },
      });

      // Прив'язуємо всі послуги салону
      if (salonServices.length > 0) {
        await tx.masterService.createMany({
          data: salonServices.map(s => ({
            masterId: newMaster.id,
            serviceId: s.id,
          })),
          skipDuplicates: true,
        });
      }

      // Позначаємо запрошення як використане
      await tx.staffInvitation.update({
        where: { id: invitation.id },
        data: {
          isUsed: true,
          masterId: newMaster.id,
        },
      });

      // Аудит лог
      await tx.auditLog.create({
        data: {
          salonId: invitation.salonId,
          actorType: 'master',
          actorId: newMaster.id,
          actorName: newMaster.name,
          action: 'CREATE',
          entityType: 'master',
          entityId: newMaster.id,
          entityName: newMaster.name,
          changes: { event: 'Master registered via invitation' },
        },
      });

      return newMaster;
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

// GET /api/invitations/accept?token=xxx - перевірити токен
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

    // Записуємо що посилання відкрили
    if (!invitation.viewedAt) {
      await prisma.staffInvitation.update({
        where: { id: invitation.id },
        data: { viewedAt: new Date() },
      });
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
