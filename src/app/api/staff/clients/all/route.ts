import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyStaffToken } from '@/lib/staff-auth'

// GET /api/staff/clients/all — отримати всіх клієнтів салону
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyStaffToken(request)
    if (auth instanceof NextResponse) return auth

    const { searchParams } = new URL(request.url)
    const salonId = searchParams.get('salonId') || auth.salonId
    const search = searchParams.get('search') || ''
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)

    // Мастер може бачити тільки клієнтів свого салону
    if (salonId !== auth.salonId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Normalize phone search (remove spaces, +, -)
    const normalizedSearch = search.replace(/[\s+\-()]/g, '')
    
    const where = {
      salonId,
      ...(search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { phone: { contains: normalizedSearch } },
        ]
      } : {})
    }

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
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
        skip: offset,
        take: limit,
      }),
      prisma.client.count({ where }),
    ])

    // Add default values for master-specific stats
    const clientsWithStats = clients.map(c => ({
      ...c,
      visitsWithMaster: c.visitsCount || 0,
      spentWithMaster: c.totalSpent || 0,
      lastVisitWithMaster: null,
    }))

    return NextResponse.json({
      clients: clientsWithStats,
      total,
      offset,
      limit,
      hasMore: offset + clients.length < total,
    })
  } catch (error) {
    console.error('Staff clients all GET error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
