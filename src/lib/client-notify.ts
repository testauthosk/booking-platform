import { sendMessageWithButtons } from '@/lib/telegram-bot';

interface BookingNotifyData {
  bookingId: string;
  clientChatId: string;
  serviceName: string;
  masterName: string;
  date: string;
  time: string;
  duration: number;
  price?: number;
  salonName: string;
}

/**
 * Send booking confirmation to client via Telegram.
 * Fire-and-forget — never throws.
 */
export async function notifyClientTelegram(data: BookingNotifyData): Promise<void> {
  try {
    const priceStr = data.price ? `\n💰 ${data.price} ₴` : '';

    await sendMessageWithButtons(
      data.clientChatId,
      `📋 <b>Новий запис у ${data.salonName}</b>\n\n` +
      `💇 ${data.serviceName}\n` +
      `👨‍💼 ${data.masterName}\n` +
      `📅 ${data.date} о ${data.time}\n` +
      `⏱ ${data.duration} хв` +
      priceStr +
      `\n\nОберіть дію:`,
      [
        [
          { text: '✅ Підтверджую', callback_data: `confirm_${data.bookingId}` },
          { text: '🕐 Запізнюсь', callback_data: `late_${data.bookingId}` },
        ],
        [
          { text: '❌ Скасувати', callback_data: `cancel_${data.bookingId}` },
        ],
      ]
    );
  } catch (error) {
    console.error('[CLIENT NOTIFY] Telegram error:', error);
  }
}
