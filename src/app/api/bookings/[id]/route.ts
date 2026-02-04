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
    const { clientId, clientName, clientPhone, serviceId, date, time, duration, extraTime, status } = body;

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

    // Перевірка: чи запис вже почався (не можна міняти клієнта/послугу після початку)
    const [bookingHour, bookingMin] = existing.time.split(':').map(Number);
    const [bookingYear, bookingMonth, bookingDay] = existing.date.split('-').map(Number);
    const bookingStart = new Date(bookingYear, bookingMonth - 1, bookingDay, bookingHour, bookingMin);
    const hasStarted = new Date() >= bookingStart;

    // Блокувати зміну клієнта/послуги після початку
    if (hasStarted) {
      if (clientId !== undefined && clientId !== existing.clientId) {
        return NextResponse.json({ 
          error: 'Неможливо змінити клієнта — запис вже почався' 
        }, { status: 400 });
      }
      if (serviceId !== undefined && serviceId !== existing.serviceId) {
        return NextResponse.json({ 
          error: 'Неможливо змінити послугу — запис вже почався' 
        }, { status: 400 });
      }
    }

    // Підготувати дані для оновлення
    const updateData: any = {};

    if (date !== undefined) updateData.date = date;
    if (time !== undefined) updateData.time = time;
    if (duration !== undefined) updateData.duration = duration;
    if (extraTime !== undefined) updateData.extraTime = extraTime;
    if (status !== undefined) updateData.status = status;

    // Якщо змінився клієнт
    if (clientId !== undefined && clientId !== existing.clientId) {
      if (clientId) {
        const client = await prisma.client.findUnique({
          where: { id: clientId }
        });
        if (client) {
          updateData.clientId = clientId;
          updateData.clientName = client.name;
          updateData.clientPhone = client.phone;
        }
      } else {
        // Якщо clientId = null/undefined але є clientName/clientPhone — використати їх
        if (clientName) updateData.clientName = clientName;
        if (clientPhone) updateData.clientPhone = clientPhone;
        updateData.clientId = null;
      }
    }

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
