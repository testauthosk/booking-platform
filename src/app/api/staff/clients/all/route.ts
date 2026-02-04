import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// GET /api/staff/clients/all — отримати всіх клієнтів салону для пошуку
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const salonId = searchParams.get('salonId')
    const search = searchParams.get('search') || ''

    if (!salonId) {
      return NextResponse.json({ error: 'salonId required' }, { status: 400 })
    }

    const clients = await prisma.client.findMany({
      where: { 
        salonId,
        ...(search ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search } },
          ]
        } : {})
      },
      select: {
        id: true,
        name: true,
        phone: true,
      },
      orderBy: { name: 'asc' },
      take: 50, // Limit for performance
    })

    return NextResponse.json(clients)
  } catch (error) {
    console.error('Staff clients all GET error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
