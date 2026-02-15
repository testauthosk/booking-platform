import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/prisma';
import { verifyStaffToken } from '@/lib/staff-auth';

// Predefined color palette for auto-assigning master colors
const MASTER_COLORS = [
  '#A6445D', '#2E4053', '#62929E', '#B08968', '#8B6F82',
  '#723E31', '#5B6E74', '#C09BAC', '#A0826D', '#C4A57B',
  '#D88B79', '#142F40', '#9C7B7A', '#D9B6A3', '#6B8F71',
];

// GET /api/masters - список мастеров (доступ: owner через NextAuth АБО master через JWT)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const salonId = searchParams.get('salonId');

    if (!salonId) {
      return NextResponse.json({ error: 'salonId required' }, { status: 400 });
    }

    // Спочатку перевіряємо NextAuth (owner/admin)
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { salonId: true, role: true },
      });
      if (user?.role !== 'SUPER_ADMIN' && user?.salonId !== salonId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else {
      // Fallback: перевіряємо JWT (staff/master)
      const staffAuth = await verifyStaffToken(request);
      if (staffAuth instanceof NextResponse) return staffAuth;
      if (staffAuth.salonId !== salonId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const masters = await prisma.master.findMany({
      where: { salonId, isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        color: true,
        isActive: true,
        rating: true,
        reviewCount: true,
        workingHours: true,
        passwordHash: true,
      },
      orderBy: { sortOrder: 'asc' },
    });

    // Return passwordHash as boolean flag (never expose actual hash)
    const mastersWithFlag = masters.map(({ passwordHash, ...rest }) => ({
      ...rest,
      hasPassword: !!passwordHash,
    }));

    return NextResponse.json(mastersWithFlag);
  } catch (error) {
    console.error('GET /api/masters error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/masters - створити майстра напряму (managed master, без кабінету)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { salonId: true, role: true },
    });

    if (!user?.salonId) {
      return NextResponse.json({ error: 'Салон не знайдено' }, { status: 400 });
    }

    if (user.role !== 'SALON_OWNER' && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      role,
      phone,
      email,
      avatar,
      bio,
      workingHours,
      lunchStart,
      lunchDuration,
      services,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Ім'я обов'язкове" }, { status: 400 });
    }

    // If email provided, check uniqueness
    if (email && email.trim()) {
      const existingMaster = await prisma.master.findUnique({
        where: { email: email.trim() },
      });
      if (existingMaster) {
        return NextResponse.json({ error: 'Цей email вже використовується' }, { status: 400 });
      }
    }

    // Auto-assign color based on current master count
    const masterCount = await prisma.master.count({
      where: { salonId: user.salonId },
    });
    const autoColor = MASTER_COLORS[masterCount % MASTER_COLORS.length];

    // Get salon timezone
    const salon = await prisma.salon.findUnique({
      where: { id: user.salonId },
      select: { timezone: true },
    });

    // Create master
    const master = await prisma.master.create({
      data: {
        salonId: user.salonId,
        name: name.trim(),
        role: role?.trim() || null,
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        avatar: avatar || null,
        bio: bio?.trim() || null,
        color: autoColor,
        passwordHash: null, // No login — managed master
        workingHours: workingHours || null,
        lunchStart: lunchStart || '13:00',
        lunchDuration: lunchDuration ?? 60,
        timezone: salon?.timezone || 'Europe/Kiev',
        sortOrder: masterCount,
      },
    });

    // Create MasterService records if services provided
    if (services && Array.isArray(services) && services.length > 0) {
      await prisma.masterService.createMany({
        data: services.map((s: { serviceId: string; customPrice?: number }) => ({
          masterId: master.id,
          serviceId: s.serviceId,
          customPrice: s.customPrice ?? null,
        })),
        skipDuplicates: true,
      });
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        salonId: user.salonId,
        actorType: 'user',
        actorId: session.user.id,
        actorName: session.user.name || session.user.email || 'Owner',
        action: 'CREATE',
        entityType: 'master',
        entityId: master.id,
        entityName: master.name,
        changes: { event: 'Managed master created', hasEmail: !!email },
      },
    });

    // Return created master with services
    const created = await prisma.master.findUnique({
      where: { id: master.id },
      include: { services: { include: { service: true } } },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/masters error:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Email вже використовується' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
