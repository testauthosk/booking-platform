import { sendMessage } from '@/lib/telegram-bot';
import { sendBookingConfirmation } from '@/lib/email';
import { buildReviewUrl } from '@/lib/review-token';

interface ReviewRequestData {
  bookingId: string;
  clientName: string;
  clientEmail?: string | null;
  clientChatId?: string | null;
  serviceName: string;
  masterName: string;
  salonName: string;
}

/**
 * Send review request to client via Telegram and/or email.
 * Fire-and-forget — never throws.
 */
export async function sendReviewRequest(data: ReviewRequestData): Promise<void> {
  const reviewUrl = buildReviewUrl(data.bookingId);

  // Telegram
  if (data.clientChatId) {
    try {
      await sendMessage(
        data.clientChatId,
        `⭐ <b>Як вам візит?</b>\n\n` +
        `Дякуємо що відвідали ${data.salonName}!\n` +
        `Послуга: ${data.serviceName}\n` +
        `Майстер: ${data.masterName}\n\n` +
        `Будь ласка, залиште відгук — це займе 30 секунд:\n` +
        `👉 ${reviewUrl}`
      );
    } catch (error) {
      console.error('[REVIEW REQUEST] Telegram error:', error);
    }
  }

  // Email
  if (data.clientEmail) {
    try {
      const { Resend } = await import('resend');
      const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
      if (!resend) return;

      await resend.emails.send({
        from: process.env.EMAIL_FROM || 'noreply@tholim.com',
        to: data.clientEmail,
        subject: `⭐ Як вам візит у ${data.salonName}?`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto;">
            <div style="background: #1a1a1a; padding: 24px; border-radius: 16px 16px 0 0;">
              <h1 style="color: #fff; font-size: 20px; margin: 0;">Як вам візит? ⭐</h1>
              <p style="color: #999; font-size: 14px; margin: 4px 0 0;">${data.salonName}</p>
            </div>
            <div style="background: #f8f8f8; padding: 24px;">
              <p style="color: #333; font-size: 15px; margin: 0 0 16px;">
                Привіт, ${data.clientName}! Дякуємо що відвідали нас.
              </p>
              <div style="background: #fff; border-radius: 12px; padding: 16px; border: 1px solid #e5e5e5; margin-bottom: 20px;">
                <p style="color: #666; font-size: 13px; margin: 0 0 4px;">💇 ${data.serviceName}</p>
                <p style="color: #666; font-size: 13px; margin: 0;">👨‍💼 ${data.masterName}</p>
              </div>
              <a href="${reviewUrl}" style="display: block; text-align: center; background: #1a1a1a; color: #fff; padding: 14px 24px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 15px;">
                Залишити відгук
              </a>
              <p style="color: #999; font-size: 11px; text-align: center; margin: 16px 0 0;">
                Це займе лише 30 секунд
              </p>
            </div>
            <div style="background: #f0f0f0; padding: 16px; border-radius: 0 0 16px 16px; text-align: center;">
              <p style="color: #999; font-size: 11px; margin: 0;">Цей лист надіслано автоматично.</p>
            </div>
          </div>
        `,
      });
    } catch (error) {
      console.error('[REVIEW REQUEST] Email error:', error);
    }
  }
}
