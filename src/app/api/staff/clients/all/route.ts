import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// GET /api/staff/clients/all — отримати всіх клієнтів салону
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
        email: true,
        telegramUsername: true,
        telegramChatId: true,
        visitsCount: true,
        totalSpent: true,
        notes: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    // Add default values for master-specific stats (will be 0 for new clients)
    const clientsWithStats = clients.map(c => ({
      ...c,
      visitsWithMaster: c.visitsCount || 0,
      spentWithMaster: c.totalSpent || 0,
      lastVisitWithMaster: null,
    }))

    return NextResponse.json(clientsWithStats)
  } catch (error) {
    console.error('Staff clients all GET error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
