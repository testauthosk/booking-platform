import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import prisma from '@/lib/prisma'
import { sendMessage } from '@/lib/telegram-bot'
import crypto from 'crypto'

// POST /api/salon/unpublish — initiate unpublish (sends OTP)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { salonId: true, telegramChatId: true, email: true },
    })
    if (!user?.salonId) {
      return NextResponse.json({ error: 'No salon' }, { status: 400 })
    }

    const salon = await prisma.salon.findUnique({
      where: { id: user.salonId },
      select: { isPublished: true },
    })
    if (!salon?.isPublished) {
      return NextResponse.json({ error: 'Сторінка не опублікована' }, { status: 400 })
    }

    // Generate 6-digit OTP
    const code = crypto.randomInt(100000, 999999).toString()
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 min

    // Save OTP
    await prisma.otpCode.create({
      data: {
        code,
        type: 'UNPUBLISH',
        channel: user.telegramChatId ? 'TELEGRAM' : 'EMAIL',
        userId: session.user.id,
        expiresAt,
      },
    })

    // Send via Telegram if connected, otherwise email
    let sentVia = 'email'
    if (user.telegramChatId) {
      const sent = await sendMessage(
        user.telegramChatId,
        `🔐 <b>Код підтвердження видалення сторінки:</b>\n\n<code>${code}</code>\n\nДійсний 5 хвилин.\n\n⚠️ Якщо ви не запитували це — проігноруйте.`
      )
      if (sent) {
        sentVia = 'telegram'
      }
    }

    // TODO: email fallback (not implemented yet)

    return NextResponse.json({
      ok: true,
      sentVia,
      hint: sentVia === 'telegram'
        ? 'Код відправлено в Telegram'
        : `Код відправлено на ${user.email || 'вашу пошту'}`,
    })
  } catch (error) {
    console.error('[UNPUBLISH] Error sending OTP:', error)
    return NextResponse.json({ error: 'Помилка сервера' }, { status: 500 })
  }
}

// PUT /api/salon/unpublish — confirm unpublish with OTP code
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { code } = await request.json()
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Введіть код' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { salonId: true },
    })
    if (!user?.salonId) {
      return NextResponse.json({ error: 'No salon' }, { status: 400 })
    }

    // Find valid OTP
    const otp = await prisma.otpCode.findFirst({
      where: {
        code,
        type: 'UNPUBLISH',
        userId: session.user.id,
        verified: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!otp) {
      return NextResponse.json({ error: 'Невірний або застарілий код' }, { status: 400 })
    }

    // Mark OTP as used
    await prisma.otpCode.update({
      where: { id: otp.id },
      data: { verified: true },
    })

    // Unpublish salon
    await prisma.salon.update({
      where: { id: user.salonId },
      data: { isPublished: false },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[UNPUBLISH] Error confirming:', error)
    return NextResponse.json({ error: 'Помилка сервера' }, { status: 500 })
  }
}
