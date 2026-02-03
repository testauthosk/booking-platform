import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import prisma from '@/lib/prisma';

// GET /api/bookings/[id] - отримати бронювання
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: params.id },
      include: {
        service: true,
        master: true,
        client: true,
      }
    });

    if (!booking) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(booking);
  } catch (error) {
    console.error('Get booking error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// PATCH /api/bookings/[id] - оновити бронювання
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Отримати користувача з роллю
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, salonId: true }
    });

    const body = await request.json();
    const { serviceId, date, time, duration, extraTime, status } = body;

    // Отримати поточне бронювання
    const existing = await prisma.booking.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Перевірка прав: OWNER/ADMIN можуть редагувати будь-яке бронювання свого салону
    const isOwnerOrAdmin = user?.role === 'OWNER' || user?.role === 'ADMIN';
    const isSameSalon = existing.salonId === user?.salonId;
    
    if (!isOwnerOrAdmin && !isSameSalon) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Підготувати дані для оновлення
    const updateData: any = {};

    if (date !== undefined) updateData.date = date;
    if (time !== undefined) updateData.time = time;
    if (duration !== undefined) updateData.duration = duration;
    if (extraTime !== undefined) updateData.extraTime = extraTime;
    if (status !== undefined) updateData.status = status;

    // Якщо змінилась послуга — оновити назву і ціну
    if (serviceId && serviceId !== existing.serviceId) {
      const service = await prisma.service.findUnique({
        where: { id: serviceId }
      });
      
      if (service) {
        updateData.serviceId = serviceId;
        updateData.serviceName = service.name;
        updateData.price = service.price;
        // Якщо duration не передано явно — взяти з послуги
        if (duration === undefined) {
          updateData.duration = service.duration;
        }
      }
    }

    // Обчислити timeEnd
    if (updateData.time || updateData.duration || updateData.extraTime !== undefined) {
      const finalTime = updateData.time || existing.time;
      const finalDuration = (updateData.duration || existing.duration) + (updateData.extraTime ?? existing.extraTime ?? 0);
      
      const [h, m] = finalTime.split(':').map(Number);
      const endMinutes = h * 60 + m + finalDuration;
      updateData.timeEnd = `${Math.floor(endMinutes / 60).toString().padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}`;
    }

    // Оновити
    const updated = await prisma.booking.update({
      where: { id: params.id },
      data: updateData,
      include: {
        service: true,
        master: true,
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update booking error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// DELETE /api/bookings/[id] - видалити/скасувати бронювання
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Отримати користувача та бронювання для перевірки прав
    const [user, booking] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true, salonId: true }
      }),
      prisma.booking.findUnique({
        where: { id: params.id },
        select: { salonId: true }
      })
    ]);

    if (!booking) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Перевірка прав
    const isOwnerOrAdmin = user?.role === 'OWNER' || user?.role === 'ADMIN';
    const isSameSalon = booking.salonId === user?.salonId;
    
    if (!isOwnerOrAdmin && !isSameSalon) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Скасовуємо замість видалення (для історії)
    const updated = await prisma.booking.update({
      where: { id: params.id },
      data: { status: 'CANCELLED' }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Delete booking error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
