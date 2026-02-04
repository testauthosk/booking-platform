import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// GET /api/staff/clients — отримати клієнтів мастера (тих що мали записи до нього)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const masterId = searchParams.get('masterId')
    const search = searchParams.get('search') || ''

    if (!masterId) {
      return NextResponse.json({ error: 'masterId required' }, { status: 400 })
    }

    // Знаходимо всі записи до цього мастера
    const bookings = await prisma.booking.findMany({
      where: { 
        masterId,
        clientId: { not: null },
      },
      select: {
        clientId: true,
        client: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            telegramUsername: true,
            telegramChatId: true,
            visitsCount: true,
            totalSpent: true,
            notes: true,
            createdAt: true,
          }
        },
        date: true,
        price: true,
        status: true,
      },
      orderBy: { date: 'desc' }
    })

    // Групуємо по клієнтах і рахуємо статистику для ЦЬОГО мастера
    const clientsMap = new Map<string, {
      client: any;
      visitsWithMaster: number;
      spentWithMaster: number;
      lastVisitWithMaster: Date;
    }>()

    for (const booking of bookings) {
      if (!booking.client || !booking.clientId) continue

      const existing = clientsMap.get(booking.clientId)
      const isCompleted = booking.status === 'COMPLETED'
      const bookingDate = new Date(booking.date)
      
      if (existing) {
        if (isCompleted) {
          existing.visitsWithMaster++
          existing.spentWithMaster += booking.price || 0
        }
        if (bookingDate > existing.lastVisitWithMaster) {
          existing.lastVisitWithMaster = bookingDate
        }
      } else {
        clientsMap.set(booking.clientId, {
          client: booking.client,
          visitsWithMaster: isCompleted ? 1 : 0,
          spentWithMaster: isCompleted ? (booking.price || 0) : 0,
          lastVisitWithMaster: bookingDate,
        })
      }
    }

    // Перетворюємо в масив і додаємо статистику
    let clients = Array.from(clientsMap.values()).map(({ client, visitsWithMaster, spentWithMaster, lastVisitWithMaster }) => ({
      ...client,
      visitsWithMaster,
      spentWithMaster,
      lastVisitWithMaster: lastVisitWithMaster?.toISOString() || null,
    }))

    // Фільтруємо по пошуку
    if (search) {
      const searchLower = search.toLowerCase()
      clients = clients.filter(c => 
        c.name.toLowerCase().includes(searchLower) ||
        c.phone.includes(search) ||
        (c.email?.toLowerCase() || '').includes(searchLower)
      )
    }

    // Сортуємо по останньому візиту
    clients.sort((a, b) => {
      if (!a.lastVisitWithMaster) return 1
      if (!b.lastVisitWithMaster) return -1
      return new Date(b.lastVisitWithMaster).getTime() - new Date(a.lastVisitWithMaster).getTime()
    })

    return NextResponse.json(clients)
  } catch (error) {
    console.error('[STAFF_CLIENTS_GET]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// PATCH /api/staff/clients — оновити клієнта (мастер може редагувати своїх)
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const masterId = searchParams.get('masterId')
    const clientId = searchParams.get('clientId')

    if (!masterId || !clientId) {
      return NextResponse.json({ error: 'masterId and clientId required' }, { status: 400 })
    }

    // Перевіряємо що мастер мав записи з цим клієнтом
    const hasBooking = await prisma.booking.findFirst({
      where: { masterId, clientId }
    })

    if (!hasBooking) {
      return NextResponse.json({ error: 'Access denied - not your client' }, { status: 403 })
    }

    const body = await request.json()
    
    // Дозволені поля для оновлення
    const allowedFields = ['name', 'phone', 'email', 'notes', 'telegramUsername']
    const updateData: Record<string, any> = {}
    
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    const client = await prisma.client.update({
      where: { id: clientId },
      data: updateData,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        telegramUsername: true,
        telegramChatId: true,
        visitsCount: true,
        totalSpent: true,
        notes: true,
        createdAt: true,
      }
    })

    return NextResponse.json(client)
  } catch (error) {
    console.error('[STAFF_CLIENTS_PATCH]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
