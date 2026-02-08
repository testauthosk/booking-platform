import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { sendMessage } from '@/lib/telegram-bot'

interface TelegramUpdate {
  update_id: number
  message?: {
    message_id: number
    from: {
      id: number
      is_bot: boolean
      first_name: string
      last_name?: string
      username?: string
      language_code?: string
    }
    chat: {
      id: number
      type: string
    }
    date: number
    text?: string
  }
}

export async function POST(req: NextRequest) {
  try {
    const update: TelegramUpdate = await req.json()
    
    console.log('[TELEGRAM WEBHOOK] Отримано update:', JSON.stringify(update, null, 2))

    const message = update.message
    if (!message?.text) {
      return NextResponse.json({ ok: true })
    }

    const chatId = message.chat.id.toString()
    const telegramId = message.from.id.toString()
    const username = message.from.username
    const text = message.text.trim()

    // Обробка /start
    if (text.startsWith('/start')) {
      const parts = text.split(' ')
      
      // Deep link: /start link_XXXXX
      if (parts.length > 1 && parts[1].startsWith('link_')) {
        const token = parts[1]
        await handleLinkTelegram(telegramId, username, chatId, token)
      } else {
        // Звичайний /start
        await sendWelcomeMessage(chatId)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[TELEGRAM WEBHOOK] Error:', error)
    return NextResponse.json({ ok: true }) // Завжди повертаємо 200 для Telegram
  }
}

async function sendWelcomeMessage(chatId: string) {
  const welcomeText = `👋 Вітаємо в Booking Platform!

Цей бот допомагає:
• 🔐 Входити в акаунт через OTP код
• 🔔 Отримувати сповіщення про записи

Щоб прив'язати Telegram до вашого акаунту:
1. Увійдіть на сайт
2. Перейдіть в налаштування профілю
3. Натисніть "Підключити Telegram"

Потрібна допомога? Звертайтесь до підтримки.`

  await sendMessage(chatId, welcomeText)
}

async function handleLinkTelegram(
  telegramId: string,
  username: string | undefined,
  chatId: string,
  token: string
) {
  try {
    // Шукаємо токен
    const linkRecord = await prisma.otpCode.findFirst({
      where: {
        code: token,
        type: 'LINK_TELEGRAM',
        expiresAt: { gt: new Date() },
      },
    })

    if (!linkRecord || !linkRecord.userId) {
      await sendMessage(chatId, 
        '❌ Посилання недійсне або застаріле.\n\nСпробуйте згенерувати нове посилання в налаштуваннях профілю.'
      )
      return
    }

    // Перевіряємо чи цей telegramId вже прив'язаний до іншого акаунту
    const existingUser = await prisma.user.findFirst({
      where: { telegramId },
    })

    if (existingUser && existingUser.id !== linkRecord.userId) {
      await sendMessage(chatId,
        '⚠️ Цей Telegram акаунт вже прив\'язаний до іншого профілю.\n\nЯкщо хочете прив\'язати до нового — спочатку відв\'яжіть в налаштуваннях старого акаунту.'
      )
      return
    }

    // Прив'язуємо Telegram до користувача
    await prisma.user.update({
      where: { id: linkRecord.userId },
      data: {
        telegramId,
        telegramUsername: username,
        telegramChatId: chatId,
      },
    })

    // Позначаємо токен як використаний
    await prisma.otpCode.update({
      where: { id: linkRecord.id },
      data: { verified: true },
    })

    console.log(`[TELEGRAM] Telegram ${telegramId} прив'язано до користувача ${linkRecord.userId}`)

    await sendMessage(chatId,
      `✅ Telegram успішно підключено!

Тепер ви можете:
• Входити через OTP код у Telegram
• Отримувати сповіщення про нові записи

Дякуємо за використання Booking Platform! 🎉`
    )
  } catch (error) {
    console.error('[TELEGRAM] Error linking:', error)
    await sendMessage(chatId,
      '❌ Виникла помилка при підключенні. Спробуйте ще раз.'
    )
  }
}

// GET для перевірки webhook
export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    message: 'Telegram webhook is running' 
  })
}
