import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { verifyStaffToken, assertOwnMaster } from '@/lib/staff-auth';
import { staffAuditLog } from '@/lib/staff-audit';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyStaffToken(request);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const masterId = searchParams.get('masterId');

    const denied = assertOwnMaster(auth, masterId);
    if (denied) return denied;

    const master = await prisma.master.findUnique({
      where: { id: masterId! },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        avatar: true,
        bio: true,
        role: true,
        workingHours: true,
        color: true,
        lunchDuration: true,
        lunchStart: true,
        salon: {
          select: {
            name: true,
            paletteId: true,
          }
        }
      }
    });

    if (!master) {
      return NextResponse.json({ error: 'Master not found' }, { status: 404 });
    }

    // Calculate real stats for profile page
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const [monthBookings, avgRating] = await Promise.all([
      prisma.booking.count({
        where: {
          masterId: masterId!,
          date: { gte: monthStart, lte: monthEnd },
          status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        }
      }),
      prisma.review.aggregate({
        where: { masterId: masterId! },
        _avg: { rating: true },
        _count: { rating: true },
      })
    ]);

    return NextResponse.json({
      ...master,
      salonName: master.salon?.name || '',
      paletteId: master.salon?.paletteId || 'champagne-gold',
      stats: {
        monthBookings,
        avgRating: avgRating._avg.rating ?? 5.0,
        reviewCount: avgRating._count.rating ?? 0,
      }
    });
  } catch (error) {
    console.error('Staff profile error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyStaffToken(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { masterId, name, phone, bio, workingHours, color, avatar, lunchDuration, lunchStart } = body;

    const denied = assertOwnMaster(auth, masterId);
    if (denied) return denied;

    // Validate phone format if provided
    if (phone !== undefined && phone !== null && phone !== '') {
      const phoneDigits = phone.replace(/\D/g, '');
      if (phoneDigits.length < 10 || phoneDigits.length > 13) {
        return NextResponse.json({ error: 'Невірний формат телефону' }, { status: 400 });
      }
    }

    // Validate workingHours structure if provided
    if (workingHours !== undefined && workingHours !== null) {
      const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      if (typeof workingHours !== 'object' || Array.isArray(workingHours)) {
        return NextResponse.json({ error: 'Невірний формат графіку роботи' }, { status: 400 });
      }
      for (const [key, value] of Object.entries(workingHours)) {
        if (!validDays.includes(key)) {
          return NextResponse.json({ error: `Невідомий день: ${key}` }, { status: 400 });
        }
        const day = value as { enabled?: boolean; start?: string; end?: string };
        if (day.start && day.end && day.start >= day.end) {
          return NextResponse.json({ error: `Час початку має бути раніше за час кінця (${key})` }, { status: 400 });
        }
      }
    }

    // Validate lunchDuration
    if (lunchDuration !== undefined && (typeof lunchDuration !== 'number' || lunchDuration < 0 || lunchDuration > 480)) {
      return NextResponse.json({ error: 'Невірна тривалість обіду' }, { status: 400 });
    }

    // Validate lunchStart format (HH:mm)
    if (lunchStart !== undefined && !/^\d{2}:\d{2}$/.test(lunchStart)) {
      return NextResponse.json({ error: 'Невірний формат часу обіду' }, { status: 400 });
    }

    const updated = await prisma.master.update({
      where: { id: masterId! },
      data: {
        ...(name && name.trim() && { name: name.trim() }),
        ...(phone !== undefined && { phone: phone || null }),
        ...(bio !== undefined && { bio }),
        ...(workingHours !== undefined && { workingHours }),
        ...(color !== undefined && { color }),
        ...(avatar !== undefined && { avatar: avatar || null }),
        ...(lunchDuration !== undefined && { lunchDuration }),
        ...(lunchStart !== undefined && { lunchStart })
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        avatar: true,
        bio: true,
        role: true,
        color: true,
        workingHours: true,
        lunchDuration: true,
        lunchStart: true,
      }
    });

    staffAuditLog({
      salonId: auth.salonId,
      masterId: masterId!,
      action: 'UPDATE',
      entityType: 'master_profile',
      entityId: masterId!,
      changes: { name, phone, bio, color, lunchDuration, lunchStart, workingHours: workingHours ? 'updated' : undefined },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// PATCH /api/staff/profile — change password
export async function PATCH(request: NextRequest) {
  try {
    const auth = await verifyStaffToken(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Поточний та новий пароль обовʼязкові' }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'Пароль має бути не менше 8 символів' }, { status: 400 });
    }
    if (!/[0-9]/.test(newPassword)) {
      return NextResponse.json({ error: 'Пароль має містити хоча б одну цифру' }, { status: 400 });
    }
    if (!/[A-Z]/.test(newPassword)) {
      return NextResponse.json({ error: 'Пароль має містити хоча б одну велику літеру' }, { status: 400 });
    }

    const master = await prisma.master.findUnique({
      where: { id: auth.masterId },
      select: { passwordHash: true }
    });

    if (!master?.passwordHash) {
      return NextResponse.json({ error: 'Акаунт не має паролю' }, { status: 400 });
    }

    const valid = await bcrypt.compare(currentPassword, master.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: 'Невірний поточний пароль' }, { status: 401 });
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await prisma.master.update({
      where: { id: auth.masterId },
      data: { passwordHash: newHash }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
