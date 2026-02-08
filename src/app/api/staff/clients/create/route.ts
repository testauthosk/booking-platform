import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyStaffToken } from '@/lib/staff-auth'

// POST /api/staff/clients/create — створити клієнта від імені мастера
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyStaffToken(request)
    if (auth instanceof NextResponse) return auth

    const body = await request.json()
    const { name, phone } = body
    const salonId = auth.salonId

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Імʼя обовʼязкове' }, { status: 400 })
    }
    if (!phone) {
      return NextResponse.json({ error: 'Телефон обовʼязковий' }, { status: 400 })
    }
    const phoneDigits = phone.replace(/\D/g, '')
    if (phoneDigits.length < 10 || phoneDigits.length > 13) {
      return NextResponse.json({ error: 'Невірний формат телефону' }, { status: 400 })
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
        name: name.trim(),
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
