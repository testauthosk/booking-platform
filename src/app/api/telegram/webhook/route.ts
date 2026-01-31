import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

interface TelegramUpdate {
  message?: {
    chat: {
      id: number;
    };
    text?: string;
    from?: {
      id: number;
      username?: string;
      first_name?: string;
    };
  };
}

async function sendMessage(chatId: number, text: string) {
  await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    }),
  });
}

export async function POST(request: NextRequest) {
  if (!TELEGRAM_BOT_TOKEN) {
    return NextResponse.json({ error: 'Bot not configured' }, { status: 500 });
  }

  try {
    const update: TelegramUpdate = await request.json();

    if (!update.message?.text) {
      return NextResponse.json({ ok: true });
    }

    const chatId = update.message.chat.id;
    const text = update.message.text;

    // Handle /start command
    if (text === '/start') {
      await sendMessage(
        chatId,
        `👋 <b>Вітаю у Booking Bot!</b>

Цей бот надсилатиме вам сповіщення про нові бронювання вашого салону.

📝 <b>Як підключити сповіщення:</b>

1. Зайдіть в панель управління вашого салону
2. Перейдіть в налаштування
3. Введіть ваш Telegram Chat ID: <code>${chatId}</code>

Або просто натисніть кнопку "Підключити Telegram" та слідуйте інструкціям.

💡 <b>Команди:</b>
/start - Показати це повідомлення
/id - Отримати ваш Chat ID
/status - Перевірити статус підключення`
      );
      return NextResponse.json({ ok: true });
    }

    // Handle /id command
    if (text === '/id') {
      await sendMessage(
        chatId,
        `🆔 Ваш Chat ID: <code>${chatId}</code>

Скопіюйте цей код та вставте в налаштуваннях салону для отримання сповіщень.`
      );
      return NextResponse.json({ ok: true });
    }

    // Handle /status command
    if (text === '/status') {
      // Check if this chat ID is linked to any user
      const user = await prisma.user.findFirst({
        where: { telegramChatId: chatId.toString() },
        select: { email: true, salonId: true }
      });

      if (user) {
        await sendMessage(
          chatId,
          `✅ <b>Підключено!</b>

📧 Акаунт: ${user.email}
🔔 Сповіщення активовано

Ви будете отримувати повідомлення про нові бронювання.`
        );
      } else {
        await sendMessage(
          chatId,
          `❌ <b>Не підключено</b>

Ваш Telegram ще не прив'язаний до акаунту.

Для підключення:
1. Зайдіть в панель управління
2. Перейдіть в налаштування
3. Введіть Chat ID: <code>${chatId}</code>`
        );
      }
      return NextResponse.json({ ok: true });
    }

    // Handle connection code (6-digit number)
    if (/^\d{6}$/.test(text)) {
      await sendMessage(
        chatId,
        `🔍 Шукаємо код підтвердження...

Якщо ви намагаєтесь підключити Telegram, переконайтесь що ввели правильний код з панелі управління.`
      );
      return NextResponse.json({ ok: true });
    }

    // Default response for unknown commands
    await sendMessage(
      chatId,
      `❓ Невідома команда.

Доступні команди:
/start - Почати
/id - Отримати Chat ID
/status - Перевірити підключення`
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Telegram webhook error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// Verify webhook (GET request from Telegram)
export async function GET() {
  return NextResponse.json({ status: 'Telegram webhook active' });
}
