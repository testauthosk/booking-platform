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
        allowed_updates: ['message'],
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
