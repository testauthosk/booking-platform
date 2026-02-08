import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.EMAIL_FROM || 'noreply@tholim.com';

/**
 * Send OTP code via email.
 * Returns true if sent, false if email not configured.
 */
export async function sendOtpEmail(
  to: string,
  code: string,
  masterName: string
): Promise<boolean> {
  if (!resend) {
    console.warn('[EMAIL] RESEND_API_KEY not set — OTP not sent, code:', code);
    return false;
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `${code} — код підтвердження входу`,
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a1a1a; margin-bottom: 8px;">Вхід з нового пристрою</h2>
          <p style="color: #666; font-size: 14px;">
            Привіт, ${masterName}! Хтось (сподіваємось, ви 😊) намагається увійти до вашого кабінету з нового пристрою.
          </p>
          <div style="background: #f5f5f5; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
            <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #1a1a1a;">${code}</span>
          </div>
          <p style="color: #999; font-size: 12px;">
            Код дійсний 5 хвилин. Якщо це не ви — просто ігноруйте це повідомлення.
          </p>
        </div>
      `,
    });
    return true;
  } catch (error) {
    console.error('[EMAIL] Failed to send OTP:', error);
    return false;
  }
}
