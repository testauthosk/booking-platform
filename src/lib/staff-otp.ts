import prisma from '@/lib/prisma';
import { sendOtpEmail } from '@/lib/email';
import { sendOtp as sendOtpTelegram } from '@/lib/telegram-bot';

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ATTEMPTS = 3;

/** Generate a 6-digit OTP code */
function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

interface SendOtpResult {
  sent: boolean;
  channel: 'email' | 'telegram';
  maskedTarget: string; // e.g. "i***@gmail.com" or "Telegram"
}

/**
 * Create and send OTP for a master.
 * Prefers Telegram if chatId exists, otherwise email.
 * Cleans up old unused OTPs for this master.
 */
export async function createAndSendOtp(
  masterId: string,
  email: string | null,
  masterName: string,
  telegramChatId?: string | null,
): Promise<SendOtpResult> {
  const code = generateCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  // Clean up old OTPs for this master
  await prisma.staffOtp.deleteMany({
    where: {
      masterId,
      OR: [{ used: true }, { expiresAt: { lt: new Date() } }],
    },
  });

  // Also invalidate any pending (unused) OTPs
  await prisma.staffOtp.updateMany({
    where: { masterId, used: false },
    data: { used: true },
  });

  // Try Telegram first
  if (telegramChatId) {
    const sent = await sendOtpTelegram(telegramChatId, code);
    if (sent) {
      await prisma.staffOtp.create({
        data: { masterId, code, expiresAt, channel: 'telegram' },
      });
      return { sent: true, channel: 'telegram', maskedTarget: 'Telegram' };
    }
  }

  // Fallback to email
  if (email) {
    await prisma.staffOtp.create({
      data: { masterId, code, expiresAt, channel: 'email' },
    });
    const sent = await sendOtpEmail(email, code, masterName);
    const maskedEmail = maskEmail(email);
    return { sent, channel: 'email', maskedTarget: maskedEmail };
  }

  return { sent: false, channel: 'email', maskedTarget: '' };
}

/**
 * Verify OTP code. Returns true if valid.
 */
export async function verifyOtp(
  masterId: string,
  code: string
): Promise<{ valid: boolean; error?: string }> {
  const otp = await prisma.staffOtp.findFirst({
    where: {
      masterId,
      used: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!otp) {
    return { valid: false, error: 'Код не знайдено або термін дії вичерпано' };
  }

  if (otp.attempts >= MAX_ATTEMPTS) {
    await prisma.staffOtp.update({
      where: { id: otp.id },
      data: { used: true },
    });
    return { valid: false, error: 'Забагато спроб. Запросіть новий код' };
  }

  if (otp.code !== code) {
    await prisma.staffOtp.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });
    const remaining = MAX_ATTEMPTS - otp.attempts - 1;
    return {
      valid: false,
      error: remaining > 0
        ? `Невірний код. Залишилось спроб: ${remaining}`
        : 'Невірний код. Запросіть новий',
    };
  }

  // Mark as used
  await prisma.staffOtp.update({
    where: { id: otp.id },
    data: { used: true },
  });

  return { valid: true };
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***';
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***@${domain}`;
}
