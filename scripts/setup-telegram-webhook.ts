/**
 * Скрипт для налаштування Telegram webhook
 * 
 * Використання:
 *   npx ts-node scripts/setup-telegram-webhook.ts
 * 
 * Або через tsx:
 *   npx tsx scripts/setup-telegram-webhook.ts
 */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8333015869:AAGnnlCkf8NGrASyEBv2sXoOQ2TF3nEC5aw';
const APP_URL = process.env.NEXTAUTH_URL || 'https://booking-platform-production-7d5d.up.railway.app';
const WEBHOOK_PATH = '/api/telegram/webhook';

const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

interface TelegramResponse {
  ok: boolean;
  result?: unknown;
  description?: string;
}

async function getBotInfo(): Promise<void> {
  console.log('📱 Отримання інформації про бота...\n');
  
  const response = await fetch(`${TELEGRAM_API}/getMe`);
  const data: TelegramResponse = await response.json();
  
  if (!data.ok) {
    console.error('❌ Помилка:', data.description);
    return;
  }
  
  const bot = data.result as { id: number; username: string; first_name: string };
  console.log(`✅ Бот: @${bot.username}`);
  console.log(`   ID: ${bot.id}`);
  console.log(`   Ім'я: ${bot.first_name}\n`);
}

async function getWebhookInfo(): Promise<void> {
  console.log('🔍 Поточний стан webhook:\n');
  
  const response = await fetch(`${TELEGRAM_API}/getWebhookInfo`);
  const data: TelegramResponse = await response.json();
  
  if (!data.ok) {
    console.error('❌ Помилка:', data.description);
    return;
  }
  
  const info = data.result as {
    url: string;
    has_custom_certificate: boolean;
    pending_update_count: number;
    last_error_date?: number;
    last_error_message?: string;
  };
  
  if (info.url) {
    console.log(`   URL: ${info.url}`);
    console.log(`   Очікуючі оновлення: ${info.pending_update_count}`);
    if (info.last_error_message) {
      console.log(`   ⚠️ Остання помилка: ${info.last_error_message}`);
    }
  } else {
    console.log('   Webhook не налаштовано');
  }
  console.log('');
}

async function setWebhook(): Promise<void> {
  const webhookUrl = `${APP_URL}${WEBHOOK_PATH}`;
  
  console.log(`🔧 Налаштування webhook: ${webhookUrl}\n`);
  
  const response = await fetch(`${TELEGRAM_API}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: webhookUrl,
      allowed_updates: ['message'],
      drop_pending_updates: true,
    }),
  });
  
  const data: TelegramResponse = await response.json();
  
  if (!data.ok) {
    console.error('❌ Помилка:', data.description);
    return;
  }
  
  console.log('✅ Webhook успішно налаштовано!\n');
}

async function deleteWebhook(): Promise<void> {
  console.log('🗑️ Видалення webhook...\n');
  
  const response = await fetch(`${TELEGRAM_API}/deleteWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ drop_pending_updates: true }),
  });
  
  const data: TelegramResponse = await response.json();
  
  if (!data.ok) {
    console.error('❌ Помилка:', data.description);
    return;
  }
  
  console.log('✅ Webhook видалено\n');
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0] || 'setup';
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Telegram Webhook Setup');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  await getBotInfo();
  
  switch (command) {
    case 'setup':
      await setWebhook();
      await getWebhookInfo();
      break;
    case 'info':
      await getWebhookInfo();
      break;
    case 'delete':
      await deleteWebhook();
      break;
    default:
      console.log('Використання:');
      console.log('  setup  - налаштувати webhook (за замовчуванням)');
      console.log('  info   - показати інформацію про webhook');
      console.log('  delete - видалити webhook');
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main().catch(console.error);
