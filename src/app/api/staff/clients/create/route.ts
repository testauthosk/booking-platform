import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// POST /api/staff/clients/create — створити клієнта від імені мастера
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, phone, salonId, masterId } = body

    if (!name || !phone || !salonId) {
      return NextResponse.json({ error: 'name, phone, salonId required' }, { status: 400 })
    }

    // Check if client with this phone already exists in salon
    const existing = await prisma.client.findFirst({
      where: { phone, salonId }
    })

    if (existing) {
      return NextResponse.json({ error: 'Клієнт з таким номером вже існує' }, { status: 400 })
    }

    // Create client
    const client = await prisma.client.create({
      data: {
        name,
        phone,
        salonId,
      }
    })

    return NextResponse.json(client)
  } catch (error) {
    console.error('Staff create client error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
