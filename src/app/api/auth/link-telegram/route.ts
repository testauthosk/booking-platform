import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    // Перевіряємо авторизацію
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Необхідна авторизація' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { token } = body as { token?: string }

    if (!token) {
      return NextResponse.json(
        { error: 'Токен обов\'язковий' },
        { status: 400 }
      )
    }

    // Шукаємо OTP запис з типом LINK_TELEGRAM
    const linkRecord = await prisma.otpCode.findFirst({
      where: {
        code: token,
        type: 'LINK_TELEGRAM',
        verified: false,
        expiresAt: { gt: new Date() },
      },
    })

    if (!linkRecord) {
      return NextResponse.json(
        { error: 'Недійсний або прострочений токен' },
        { status: 404 }
      )
    }

    // Токен знайдено — зберігаємо userId для подальшої прив'язки через webhook
    await prisma.otpCode.update({
      where: { id: linkRecord.id },
      data: { userId: session.user.id },
    })

    console.log(`[LINK-TELEGRAM] Токен ${token} пов'язано з користувачем ${session.user.id}`)

    return NextResponse.json({
      success: true,
      message: 'Токен активовано. Тепер перейдіть в Telegram бота.',
    })
  } catch (error) {
    console.error('[LINK-TELEGRAM] Error:', error)
    return NextResponse.json(
      { error: 'Внутрішня помилка сервера' },
      { status: 500 }
    )
  }
}

// GET — генерує новий токен для прив'язки
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Необхідна авторизація' },
        { status: 401 }
      )
    }

    // Перевіряємо чи вже прив'язаний Telegram
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { telegramId: true, telegramUsername: true },
    })

    if (user?.telegramId) {
      return NextResponse.json({
        linked: true,
        telegramUsername: user.telegramUsername,
      })
    }

    // Генеруємо унікальний токен
    const token = `link_${Math.random().toString(36).substring(2, 15)}`
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 хвилин

    // Зберігаємо токен
    await prisma.otpCode.create({
      data: {
        phone: session.user.email || session.user.id,
        code: token,
        type: 'LINK_TELEGRAM',
        channel: 'TELEGRAM',
        expiresAt,
        userId: session.user.id,
      },
    })

    // Username бота
    const botUsername = 'tholim_bot'

    return NextResponse.json({
      linked: false,
      token,
      telegramLink: `https://t.me/${botUsername}?start=${token}`,
      expiresAt: expiresAt.toISOString(),
    })
  } catch (error) {
    console.error('[LINK-TELEGRAM] Error:', error)
    return NextResponse.json(
      { error: 'Внутрішня помилка сервера' },
      { status: 500 }
    )
  }
}
