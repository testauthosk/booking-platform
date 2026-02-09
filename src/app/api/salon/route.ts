import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/prisma';
import { getTimezoneFromAddress, updateSalonTimezone } from '@/lib/timezone';

// GET /api/salon - получить данные салона
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let salonId = searchParams.get('salonId');

    // Always verify user owns this salon
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { salonId: true, role: true }
    });

    if (!user?.salonId) {
      return NextResponse.json({ error: 'No salon' }, { status: 400 });
    }

    // If salonId provided, verify access
    if (salonId && user.role !== 'SUPER_ADMIN' && salonId !== user.salonId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    salonId = salonId || user.salonId;

    const salon = await prisma.salon.findUnique({
      where: { id: salonId },
    });

    if (!salon) {
      return NextResponse.json({ error: 'Salon not found' }, { status: 404 });
    }

    return NextResponse.json(salon);
  } catch (error) {
    console.error('GET /api/salon error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/salon - обновить данные салона
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      salonId,
      name,
      slug,
      type,
      description,
      phone,
      email,
      address,
      shortAddress,
      latitude,
      longitude,
      logo,
      photos,
      workingHours,
      amenities,
      bufferTime,
    } = body;

    if (!salonId) {
      return NextResponse.json({ error: 'salonId required' }, { status: 400 });
    }

    // Verify user owns this salon
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { salonId: true, role: true },
    });
    if (user?.role !== 'SUPER_ADMIN' && user?.salonId !== salonId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Validate slug uniqueness
    if (slug !== undefined && slug) {
      const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      const existingSlug = await prisma.salon.findFirst({
        where: { slug: cleanSlug, NOT: { id: salonId } },
      });
      if (existingSlug) {
        return NextResponse.json({ error: 'Цей slug вже зайнятий' }, { status: 400 });
      }
    }

    // Перевіряємо чи змінилась адреса
    let timezoneData: { timezone: string; lat?: number; lng?: number } | null = null;
    
    if (address !== undefined) {
      // Отримуємо поточну адресу салону
      const currentSalon = await prisma.salon.findUnique({
        where: { id: salonId },
        select: { address: true }
      });
      
      // Якщо адреса змінилась — визначаємо нову таймзону
      if (currentSalon?.address !== address && address) {
        console.log('Address changed, determining timezone for:', address);
        timezoneData = await getTimezoneFromAddress(address);
        
        if (timezoneData) {
          console.log('Timezone determined:', timezoneData.timezone);
        } else {
          console.warn('Could not determine timezone for address:', address);
        }
      }
    }

    // Оновлюємо салон
    const salon = await prisma.salon.update({
      where: { id: salonId },
      data: {
        ...(name !== undefined && { name }),
        ...(slug !== undefined && { slug }),
        ...(type !== undefined && { type }),
        ...(description !== undefined && { description }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
        ...(address !== undefined && { address }),
        ...(shortAddress !== undefined && { shortAddress }),
        ...(latitude !== undefined && { latitude }),
        ...(longitude !== undefined && { longitude }),
        ...(logo !== undefined && { logo }),
        ...(photos !== undefined && { photos }),
        ...(workingHours !== undefined && { workingHours }),
        ...(amenities !== undefined && { amenities }),
        ...(bufferTime !== undefined && { bufferTime }),
        // Оновлюємо таймзону і координати якщо визначили
        ...(timezoneData && {
          timezone: timezoneData.timezone,
          ...(timezoneData.lat !== undefined && { latitude: timezoneData.lat }),
          ...(timezoneData.lng !== undefined && { longitude: timezoneData.lng }),
        }),
      },
    });

    // Якщо таймзона змінилась — оновлюємо всіх мастерів салону
    if (timezoneData) {
      await prisma.master.updateMany({
        where: { salonId },
        data: { timezone: timezoneData.timezone }
      });
      console.log('Updated timezone for all masters of salon:', salonId);
    }

    return NextResponse.json(salon);
  } catch (error) {
    console.error('PATCH /api/salon error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
