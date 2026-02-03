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
        `👋 <b>Вітаю!</b>

Цей бот надсилатиме нагадування про ваші записи в салон.

💡 <b>Команди:</b>
/connect - Підключити нагадування (введіть номер телефону)
/status - Перевірити підключення
/id - Отримати ваш Chat ID

<b>Для власників салонів:</b>
Використовуйте Chat ID <code>${chatId}</code> в налаштуваннях для отримання сповіщень.`
      );
      return NextResponse.json({ ok: true });
    }

    // Handle /connect command - link client by phone
    if (text === '/connect') {
      await sendMessage(
        chatId,
        `📱 <b>Підключення нагадувань</b>

Надішліть ваш номер телефону (той, що вказували при записі).

Приклад: <code>+380501234567</code> або <code>0501234567</code>`
      );
      return NextResponse.json({ ok: true });
    }

    // Handle phone number - try to link client
    const phoneMatch = text.match(/^[\+]?[\d\s\-\(\)]{9,15}$/);
    if (phoneMatch) {
      const phone = text.replace(/[\s\-\(\)]/g, '').replace(/^0/, '+380');
      const phoneVariants = [phone, phone.replace('+', ''), '0' + phone.slice(-9)];
      
      // Search for client with this phone
      const client = await prisma.client.findFirst({
        where: {
          OR: phoneVariants.map(p => ({ phone: { contains: p.slice(-9) } })),
        },
        include: {
          salon: { select: { name: true } },
        },
      });

      if (client) {
        // Link Telegram to client
        await prisma.client.update({
          where: { id: client.id },
          data: { 
            telegramChatId: chatId.toString(),
            telegramUsername: update.message?.from?.username,
          },
        });

        await sendMessage(
          chatId,
          `✅ <b>Підключено!</b>

Ви будете отримувати нагадування про записи в <b>${client.salon.name}</b>.

📞 Телефон: ${client.phone}
👤 Ім'я: ${client.name}

Тепер бот нагадуватиме вам:
• За 24 години до візиту
• За 2 години до візиту`
        );
      } else {
        await sendMessage(
          chatId,
          `❌ <b>Клієнта не знайдено</b>

Номер ${phone} не знайдено в системі.

Переконайтесь, що ви вказали той номер, який використовували при записі в салон.`
        );
      }
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
      // Check client first
      const client = await prisma.client.findFirst({
        where: { telegramChatId: chatId.toString() },
        include: { 
          salon: { select: { name: true } },
          bookings: {
            where: { 
              status: { in: ['CONFIRMED', 'PENDING'] },
              date: { gte: new Date().toISOString().split('T')[0] },
            },
            orderBy: { date: 'asc' },
            take: 3,
          },
        },
      });

      if (client) {
        let message = `✅ <b>Підключено як клієнт</b>

👤 ${client.name}
📍 ${client.salon.name}
🔔 Нагадування активовано`;

        if (client.bookings.length > 0) {
          message += `\n\n📅 <b>Найближчі записи:</b>`;
          for (const b of client.bookings) {
            message += `\n• ${b.date} о ${b.time} — ${b.serviceName || 'візит'}`;
          }
        }

        await sendMessage(chatId, message);
        return NextResponse.json({ ok: true });
      }

      // Check admin/owner
      const user = await prisma.user.findFirst({
        where: { telegramChatId: chatId.toString() },
        select: { email: true, salonId: true }
      });

      if (user) {
        await sendMessage(
          chatId,
          `✅ <b>Підключено як власник</b>

📧 ${user.email}
🔔 Сповіщення про нові записи активовано`
        );
      } else {
        await sendMessage(
          chatId,
          `❌ <b>Не підключено</b>

Щоб отримувати нагадування про записи:
• Надішліть /connect та ваш номер телефону

Для власників салонів:
• Chat ID: <code>${chatId}</code>`
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
