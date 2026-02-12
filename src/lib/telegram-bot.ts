const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!BOT_TOKEN) {
  console.warn('[TELEGRAM] TELEGRAM_BOT_TOKEN не встановлено');
}

const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

interface TelegramResponse {
  ok: boolean;
  result?: unknown;
  description?: string;
}

/**
 * Відправляє OTP код користувачу через Telegram
 */
export async function sendOtp(telegramId: string, code: string): Promise<boolean> {
  if (!BOT_TOKEN) {
    console.error('[TELEGRAM] BOT_TOKEN не налаштований');
    return false;
  }

  const message = `🔐 Ваш код для входу: <b>${code}</b>\n\nДійсний 5 хвилин.\n\n<i>Якщо ви не запитували цей код, проігноруйте повідомлення.</i>`;

  try {
    const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: telegramId,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    const data: TelegramResponse = await response.json();

    if (!data.ok) {
      console.error('[TELEGRAM] Помилка відправки OTP:', data.description);
      return false;
    }

    console.log(`[TELEGRAM] OTP відправлено до ${telegramId}`);
    return true;
  } catch (error) {
    console.error('[TELEGRAM] Помилка відправки OTP:', error);
    return false;
  }
}

/**
 * Відправляє текстове повідомлення користувачу
 */
export async function sendMessage(telegramId: string, text: string): Promise<boolean> {
  if (!BOT_TOKEN) {
    console.error('[TELEGRAM] BOT_TOKEN не налаштований');
    return false;
  }

  try {
    const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: telegramId,
        text,
        parse_mode: 'HTML',
      }),
    });

    const data: TelegramResponse = await response.json();

    if (!data.ok) {
      console.error('[TELEGRAM] Помилка відправки повідомлення:', data.description);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[TELEGRAM] Помилка відправки повідомлення:', error);
    return false;
  }
}

/**
 * Відправляє повідомлення з inline кнопками
 */
export async function sendMessageWithButtons(
  chatId: string,
  text: string,
  buttons: { text: string; callback_data: string }[][],
): Promise<boolean> {
  if (!BOT_TOKEN) return false;

  try {
    const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: buttons },
      }),
    });

    const data: TelegramResponse = await response.json();
    if (!data.ok) {
      console.error('[TELEGRAM] Buttons send error:', data.description);
      return false;
    }
    return true;
  } catch (error) {
    console.error('[TELEGRAM] Buttons send error:', error);
    return false;
  }
}

/**
 * Відповідає на callback query (прибирає "годинник" на кнопці)
 */
export async function answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void> {
  if (!BOT_TOKEN) return;
  try {
    await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text: text || '',
      }),
    });
  } catch { /* ignore */ }
}

/**
 * Редагує повідомлення (для оновлення після натискання кнопки)
 */
export async function editMessage(chatId: string, messageId: number, text: string): Promise<void> {
  if (!BOT_TOKEN) return;
  try {
    await fetch(`${TELEGRAM_API}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: 'HTML',
      }),
    });
  } catch { /* ignore */ }
}

/**
 * Надсилає нагадування клієнту про запис з кнопками
 */
export async function sendBookingReminder(
  chatId: string,
  booking: {
    id: string;
    serviceName: string;
    masterName: string;
    date: string;
    time: string;
    salonName: string;
    salonAddress?: string;
    hoursUntil: number;
  },
): Promise<boolean> {
  const timeLabel = booking.hoursUntil === 24 ? 'Завтра' :
                    booking.hoursUntil === 2 ? 'Через 2 години' :
                    `Через ${booking.hoursUntil} год`;

  const text = `⏰ <b>${timeLabel} у вас запис</b>

📍 <b>${booking.salonName}</b>
${booking.salonAddress ? `📍 ${booking.salonAddress}\n` : ''}
💇 <b>Послуга:</b> ${booking.serviceName}
👨‍💼 <b>Майстер:</b> ${booking.masterName}
📅 <b>Дата:</b> ${booking.date}
⏰ <b>Час:</b> ${booking.time}`;

  const buttons = [
    [
      { text: '✅ Буду', callback_data: `confirm_${booking.id}` },
      { text: '❌ Скасувати', callback_data: `cancel_${booking.id}` },
    ],
    [
      { text: '🕐 Запізнюсь', callback_data: `late_${booking.id}` },
    ],
  ];

  return sendMessageWithButtons(chatId, text, buttons);
}

/**
 * Надсилає власнику сповіщення про новий запис
 */
export async function sendNewBookingNotification(
  chatId: string,
  booking: {
    clientName: string;
    clientPhone: string;
    serviceName: string;
    masterName: string;
    date: string;
    time: string;
    duration: number;
    price: number;
    salonName: string;
  },
): Promise<boolean> {
  const text = `🔔 <b>Новий запис!</b>

📍 <b>${booking.salonName}</b>

👤 <b>Клієнт:</b> ${booking.clientName}
📞 <b>Телефон:</b> ${booking.clientPhone}

💇 <b>Послуга:</b> ${booking.serviceName}
👨‍💼 <b>Майстер:</b> ${booking.masterName}

📅 <b>Дата:</b> ${booking.date}
⏰ <b>Час:</b> ${booking.time}
⏱ <b>Тривалість:</b> ${booking.duration} хв
💰 <b>Вартість:</b> ${booking.price} ₴`;

  return sendMessage(chatId, text);
}

/**
 * Встановлює webhook для бота
 */
export async function setWebhook(webhookUrl: string): Promise<boolean> {
  if (!BOT_TOKEN) {
    console.error('[TELEGRAM] BOT_TOKEN не налаштований');
    return false;
  }

  try {
    const response = await fetch(`${TELEGRAM_API}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ['message', 'callback_query'],
      }),
    });

    const data: TelegramResponse = await response.json();

    if (!data.ok) {
      console.error('[TELEGRAM] Помилка встановлення webhook:', data.description);
      return false;
    }

    console.log('[TELEGRAM] Webhook встановлено:', webhookUrl);
    return true;
  } catch (error) {
    console.error('[TELEGRAM] Помилка встановлення webhook:', error);
    return false;
  }
}

/**
 * Встановлює команди бота (кнопка Menu)
 */
export async function setMyCommands(): Promise<boolean> {
  if (!BOT_TOKEN) return false;
  try {
    const response = await fetch(`${TELEGRAM_API}/setMyCommands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commands: [
          { command: 'start', description: 'Головне меню' },
          { command: 'bookings', description: 'Мої записи' },
          { command: 'help', description: 'Допомога' },
        ],
      }),
    });
    const data: TelegramResponse = await response.json();
    return data.ok || false;
  } catch {
    return false;
  }
}

/**
 * Отримує інформацію про бота
 */
export async function getBotInfo(): Promise<{ username?: string; id?: number } | null> {
  if (!BOT_TOKEN) {
    return null;
  }

  try {
    const response = await fetch(`${TELEGRAM_API}/getMe`);
    const data = await response.json();

    if (!data.ok) {
      return null;
    }

    return {
      username: data.result?.username,
      id: data.result?.id,
    };
  } catch {
    return null;
  }
}
