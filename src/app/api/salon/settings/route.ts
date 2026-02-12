import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import prisma from '@/lib/prisma'

// GET /api/salon/settings — отримати налаштування салону
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { salonId: true },
    })
    if (!currentUser?.salonId) {
      return NextResponse.json({ error: 'No salon' }, { status: 400 })
    }

    const salon = await prisma.salon.findUnique({
      where: { id: currentUser.salonId },
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        description: true,
        phone: true,
        email: true,
        address: true,
        shortAddress: true,
        latitude: true,
        longitude: true,
        logo: true,
        photos: true,
        workingHours: true,
        amenities: true,
        timezone: true,
        currency: true,
        paletteId: true,
        rating: true,
        reviewCount: true,
      }
    })

    if (!salon) {
      return NextResponse.json({ error: 'Salon not found' }, { status: 404 })
    }

    return NextResponse.json(salon)
  } catch (error) {
    console.error('[SALON_SETTINGS_GET]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// PATCH /api/salon/settings — оновити налаштування салону
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { salonId: true },
    })
    if (!currentUser?.salonId) {
      return NextResponse.json({ error: 'No salon' }, { status: 400 })
    }

    const body = await request.json()
    
    // Дозволені поля для оновлення
    const allowedFields = [
      'name', 'slug', 'type', 'description',
      'phone', 'email', 'address', 'shortAddress',
      'latitude', 'longitude',
      'logo', 'photos',
      'workingHours', 'amenities',
      'timezone', 'currency', 'paletteId'
    ]

    // Фільтруємо тільки дозволені поля
    const updateData: Record<string, any> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    // Валідація slug (якщо змінюється)
    if (updateData.slug) {
      // Перевіряємо унікальність
      const existingSlug = await prisma.salon.findFirst({
        where: {
          slug: updateData.slug,
          NOT: { id: currentUser.salonId }
        }
      })
      if (existingSlug) {
        return NextResponse.json({ error: 'Цей slug вже зайнятий' }, { status: 400 })
      }
      // Очищаємо slug
      updateData.slug = updateData.slug
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
    }

    const salon = await prisma.salon.update({
      where: { id: currentUser.salonId },
      data: updateData,
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        description: true,
        phone: true,
        email: true,
        address: true,
        shortAddress: true,
        latitude: true,
        longitude: true,
        logo: true,
        photos: true,
        workingHours: true,
        amenities: true,
        timezone: true,
        currency: true,
        paletteId: true,
      }
    })

    return NextResponse.json(salon)
  } catch (error) {
    console.error('[SALON_SETTINGS_PATCH]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
