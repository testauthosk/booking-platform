import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { sendMessage, sendMessageWithButtons, answerCallbackQuery, editMessage } from '@/lib/telegram-bot'

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
  callback_query?: {
    id: string
    from: { id: number; username?: string }
    message?: { message_id: number; chat: { id: number } }
    data?: string
  }
}

export async function POST(req: NextRequest) {
  try {
    const update: TelegramUpdate = await req.json()
    
    console.log('[TELEGRAM WEBHOOK] Отримано update:', JSON.stringify(update, null, 2))

    // Callback query handler (inline buttons)
    if (update.callback_query) {
      await handleCallbackQuery(update.callback_query)
      return NextResponse.json({ ok: true })
    }

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
      
      // Deep link: /start link_XXXXX (owner linking)
      if (parts.length > 1 && parts[1].startsWith('link_')) {
        const token = parts[1]
        await handleLinkTelegram(telegramId, username, chatId, token)
      }
      // Deep link: /start client_XXXXX (client subscribing)
      else if (parts.length > 1 && parts[1].startsWith('client_')) {
        const clientId = parts[1].replace('client_', '')
        await handleClientSubscribe(clientId, chatId, username)
      }
      else {
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

// Client subscribes to Telegram notifications
async function handleClientSubscribe(
  clientId: string,
  chatId: string,
  username: string | undefined
) {
  try {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, name: true, salonId: true, telegramChatId: true },
    })

    if (!client) {
      await sendMessage(chatId, '❌ Посилання недійсне. Спробуйте записатись через сайт.')
      return
    }

    if (client.telegramChatId) {
      await sendMessage(chatId, `✅ Ви вже підписані на сповіщення!\n\nВам будуть приходити нагадування про записи.`)
      return
    }

    // Link Telegram to client
    await prisma.client.update({
      where: { id: clientId },
      data: {
        telegramChatId: chatId,
        telegramUsername: username || null,
      },
    })

    // Get salon name
    const salon = await prisma.salon.findUnique({
      where: { id: client.salonId },
      select: { name: true },
    })

    await sendMessage(chatId,
      `✅ Telegram підключено!\n\n` +
      `Привіт, ${client.name}! 👋\n\n` +
      `Тепер ви отримуватимете від ${salon?.name || 'салону'}:\n` +
      `• 📋 Підтвердження бронювань\n` +
      `• ⏰ Нагадування перед візитом\n` +
      `• 📢 Спеціальні пропозиції\n\n` +
      `Дякуємо! 🎉`
    )

    // Check if there's a recent unconfirmed booking and send confirmation
    const recentBooking = await prisma.booking.findFirst({
      where: {
        clientId: client.id,
        createdAt: { gt: new Date(Date.now() - 10 * 60 * 1000) }, // last 10 min
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        serviceName: true,
        masterName: true,
        date: true,
        time: true,
        duration: true,
        price: true,
      },
    })

    if (recentBooking) {
      const priceStr = recentBooking.price ? `\n💰 ${recentBooking.price} ₴` : ''
      await sendMessageWithButtons(chatId,
        `📋 <b>Ваш запис:</b>\n\n` +
        `💇 ${recentBooking.serviceName}\n` +
        `👨‍💼 ${recentBooking.masterName}\n` +
        `📅 ${recentBooking.date} о ${recentBooking.time}\n` +
        `⏱ ${recentBooking.duration} хв` +
        priceStr,
        [
          [
            { text: '✅ Підтверджую', callback_data: `confirm_${recentBooking.id}` },
            { text: '❌ Скасувати', callback_data: `cancel_${recentBooking.id}` },
          ],
        ]
      )
    }
  } catch (error) {
    console.error('[TELEGRAM] Client subscribe error:', error)
    await sendMessage(chatId, '❌ Виникла помилка. Спробуйте ще раз.')
  }
}

// Обробка натискання inline кнопок
async function handleCallbackQuery(query: NonNullable<TelegramUpdate['callback_query']>) {
  const data = query.data || ''
  const chatId = query.message?.chat.id.toString() || ''
  const messageId = query.message?.message_id || 0

  try {
    // confirm_BOOKING_ID — підтвердження візиту
    if (data.startsWith('confirm_')) {
      const bookingId = data.replace('confirm_', '')
      await answerCallbackQuery(query.id, '✅ Дякуємо! Чекаємо на вас')
      await editMessage(chatId, messageId,
        `✅ <b>Візит підтверджено!</b>\n\nДякуємо, чекаємо на вас! 🎉`)

      // Оновлюємо статус запису
      await prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'CONFIRMED' },
      }).catch(() => {})
      return
    }

    // cancel_BOOKING_ID — скасування
    if (data.startsWith('cancel_')) {
      const bookingId = data.replace('cancel_', '')
      await answerCallbackQuery(query.id, '❌ Запис скасовано')

      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        select: { serviceName: true, date: true, time: true },
      })

      await prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'CANCELLED' },
      }).catch(() => {})

      await editMessage(chatId, messageId,
        `❌ <b>Запис скасовано</b>\n\n${booking ? `${booking.serviceName} — ${booking.date} о ${booking.time}` : ''}\n\nЯкщо передумаєте — запишіться знову через сайт.`)

      // Сповіщаємо власника
      const bookingFull = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          salon: { select: { ownerId: true } },
          client: { select: { name: true, phone: true } },
        },
      })
      if (bookingFull?.salon?.ownerId) {
        const owner = await prisma.user.findUnique({
          where: { id: bookingFull.salon.ownerId },
          select: { telegramChatId: true },
        })
        if (owner?.telegramChatId) {
          await sendMessage(owner.telegramChatId,
            `❌ <b>Клієнт скасував запис</b>\n\n👤 ${bookingFull.client?.name || 'Клієнт'}\n📞 ${bookingFull.client?.phone || ''}\n💇 ${bookingFull.serviceName || ''}\n📅 ${bookingFull.date} о ${bookingFull.time}`)
        }
      }
      return
    }

    // late_BOOKING_ID — запізнюсь (показати вибір часу)
    if (data.startsWith('late_') && !data.includes('_min_')) {
      const bookingId = data.replace('late_', '')
      await answerCallbackQuery(query.id)

      const buttons = [
        [
          { text: '5 хв', callback_data: `late_${bookingId}_min_5` },
          { text: '10 хв', callback_data: `late_${bookingId}_min_10` },
          { text: '15 хв', callback_data: `late_${bookingId}_min_15` },
          { text: '30 хв', callback_data: `late_${bookingId}_min_30` },
        ],
      ]

      await editMessage(chatId, messageId, '🕐 <b>На скільки запізнюєтесь?</b>')
      // Відправляємо нове повідомлення з кнопками бо editMessage не підтримує reply_markup
      await sendMessageWithButtons(chatId, 'Оберіть час:', buttons)
      return
    }

    // late_BOOKING_ID_min_N — запізнюсь на N хвилин
    const lateMatch = data.match(/^late_(.+)_min_(\d+)$/)
    if (lateMatch) {
      const bookingId = lateMatch[1]
      const minutes = parseInt(lateMatch[2])

      await answerCallbackQuery(query.id, `🕐 Повідомлено: +${minutes} хв`)

      // Оновлюємо запис — додаємо нотатку
      await prisma.booking.update({
        where: { id: bookingId },
        data: { notes: `Клієнт запізнюється на ${minutes} хв` },
      }).catch(() => {})

      await editMessage(chatId, messageId,
        `🕐 <b>Запізнення: +${minutes} хвилин</b>\n\nМайстер повідомлений. Дякуємо що попередили! 🙏`)

      // Сповіщаємо власника та майстра
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          salon: { select: { ownerId: true } },
          client: { select: { name: true } },
          master: { select: { name: true, email: true } },
        },
      })

      if (booking?.salon?.ownerId) {
        const owner = await prisma.user.findUnique({
          where: { id: booking.salon.ownerId },
          select: { telegramChatId: true },
        })
        if (owner?.telegramChatId) {
          await sendMessage(owner.telegramChatId,
            `🕐 <b>Клієнт запізнюється</b>\n\n👤 ${booking.client?.name || 'Клієнт'}\n👨‍💼 Майстер: ${booking.master?.name || ''}\n⏰ +${minutes} хвилин\n📅 ${booking.date} о ${booking.time}`)
        }
      }

      // Якщо мастер має телеграм
      if (booking?.master?.email) {
        const masterUser = await prisma.user.findUnique({
          where: { email: booking.master.email },
          select: { telegramChatId: true },
        })
        if (masterUser?.telegramChatId) {
          await sendMessage(masterUser.telegramChatId,
            `🕐 <b>Клієнт запізнюється на ${minutes} хв</b>\n\n👤 ${booking.client?.name || 'Клієнт'}\n📅 ${booking.date} о ${booking.time}`)
        }
      }
      return
    }

    await answerCallbackQuery(query.id)
  } catch (error) {
    console.error('[TELEGRAM] Callback error:', error)
    await answerCallbackQuery(query.id, '❌ Помилка')
  }
}

// GET для перевірки webhook
export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    message: 'Telegram webhook is running' 
  })
}
