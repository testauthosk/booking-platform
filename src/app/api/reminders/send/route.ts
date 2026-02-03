import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CRON_SECRET = process.env.CRON_SECRET;

// Шаблоны по умолчанию
const DEFAULT_TEMPLATE_24H = `🔔 Нагадування про візит!

Привіт, {clientName}! 

Завтра о {time} вас чекає {serviceName} у {salonName}.

📍 {address}

Якщо плани змінились — повідомте нас, будь ласка.
До зустрічі! 💈`;

const DEFAULT_TEMPLATE_2H = `⏰ Через 2 години ваш візит!

{clientName}, нагадуємо: о {time} — {serviceName}.

📍 {salonName}
{address}

Чекаємо на вас! ✨`;

async function sendTelegramMessage(chatId: string, text: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) return false;
  
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }),
    });
    return res.ok;
  } catch (error) {
    console.error('Telegram send error:', error);
    return false;
  }
}

function formatTemplate(template: string, data: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(data)) {
    result = result.replace(new RegExp(`{${key}}`, 'g'), value || '');
  }
  return result;
}

export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const results = { sent24h: 0, sent2h: 0, errors: 0 };

    // Получаем все салоны с активными напоминаниями
    const reminderSettings = await prisma.reminderSettings.findMany({
      where: { isActive: true },
    });

    for (const settings of reminderSettings) {
      // Получаем салон
      const salon = await prisma.salon.findUnique({
        where: { id: settings.salonId },
        select: { name: true, address: true, shortAddress: true },
      });
      if (!salon) continue;

      // === 24-часовые напоминания ===
      if (settings.reminder24h) {
        const target24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const targetDate = target24h.toISOString().split('T')[0];
        const targetHour = target24h.getHours();

        // Ищем бронирования на завтра в этот час (±30 мин)
        const bookings24h = await prisma.booking.findMany({
          where: {
            salonId: settings.salonId,
            date: targetDate,
            status: { in: ['CONFIRMED', 'PENDING'] },
            client: {
              telegramChatId: { not: null },
            },
          },
          include: {
            client: true,
            service: true,
          },
        });

        for (const booking of bookings24h) {
          // Проверяем время (часы)
          const bookingHour = parseInt(booking.time.split(':')[0]);
          if (Math.abs(bookingHour - targetHour) > 1) continue;

          // Проверяем, не отправляли ли уже
          const alreadySent = await prisma.sentReminder.findUnique({
            where: { bookingId_type: { bookingId: booking.id, type: '24h' } },
          });
          if (alreadySent) continue;

          // Отправляем
          const template = settings.template24h || DEFAULT_TEMPLATE_24H;
          const message = formatTemplate(template, {
            clientName: booking.clientName,
            serviceName: booking.serviceName || booking.service?.name || 'візит',
            salonName: salon.name,
            address: salon.shortAddress || salon.address || '',
            time: booking.time,
            date: booking.date,
          });

          const success = await sendTelegramMessage(booking.client!.telegramChatId!, message);

          await prisma.sentReminder.create({
            data: {
              bookingId: booking.id,
              type: '24h',
              channel: 'telegram',
              status: success ? 'sent' : 'failed',
              errorMessage: success ? null : 'Failed to send',
            },
          });

          if (success) results.sent24h++;
          else results.errors++;
        }
      }

      // === 2-часовые напоминания ===
      if (settings.reminder2h) {
        const target2h = new Date(now.getTime() + 2 * 60 * 60 * 1000);
        const targetDate = target2h.toISOString().split('T')[0];
        const targetHour = target2h.getHours();
        const targetMinute = target2h.getMinutes();

        const bookings2h = await prisma.booking.findMany({
          where: {
            salonId: settings.salonId,
            date: targetDate,
            status: { in: ['CONFIRMED', 'PENDING'] },
            client: {
              telegramChatId: { not: null },
            },
          },
          include: {
            client: true,
            service: true,
          },
        });

        for (const booking of bookings2h) {
          const [bookingHour, bookingMinute] = booking.time.split(':').map(Number);
          const bookingTotalMinutes = bookingHour * 60 + bookingMinute;
          const targetTotalMinutes = targetHour * 60 + targetMinute;
          
          // ±15 минут от целевого времени
          if (Math.abs(bookingTotalMinutes - targetTotalMinutes) > 15) continue;

          const alreadySent = await prisma.sentReminder.findUnique({
            where: { bookingId_type: { bookingId: booking.id, type: '2h' } },
          });
          if (alreadySent) continue;

          const template = settings.template2h || DEFAULT_TEMPLATE_2H;
          const message = formatTemplate(template, {
            clientName: booking.clientName,
            serviceName: booking.serviceName || booking.service?.name || 'візит',
            salonName: salon.name,
            address: salon.shortAddress || salon.address || '',
            time: booking.time,
            date: booking.date,
          });

          const success = await sendTelegramMessage(booking.client!.telegramChatId!, message);

          await prisma.sentReminder.create({
            data: {
              bookingId: booking.id,
              type: '2h',
              channel: 'telegram',
              status: success ? 'sent' : 'failed',
              errorMessage: success ? null : 'Failed to send',
            },
          });

          if (success) results.sent2h++;
          else results.errors++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error('Reminders error:', error);
    return NextResponse.json({ error: 'Failed to process reminders' }, { status: 500 });
  }
}

// GET для ручной проверки статуса
export async function GET() {
  const settings = await prisma.reminderSettings.findMany({
    select: { salonId: true, isActive: true, reminder24h: true, reminder2h: true },
  });
  
  const recentReminders = await prisma.sentReminder.findMany({
    orderBy: { sentAt: 'desc' },
    take: 10,
    select: { type: true, channel: true, status: true, sentAt: true },
  });

  return NextResponse.json({
    status: 'Reminder system active',
    telegramConfigured: !!TELEGRAM_BOT_TOKEN,
    salonsWithReminders: settings.length,
    settings,
    recentReminders,
  });
}
