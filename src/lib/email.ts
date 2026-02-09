import { Resend } from 'resend';

export interface BookingConfirmationData {
  clientName: string;
  clientEmail: string;
  salonName: string;
  salonAddress?: string;
  salonPhone?: string;
  serviceName: string;
  masterName: string;
  date: string; // "2026-02-15"
  time: string; // "14:30"
  duration: number; // minutes
  price?: number;
  cancelUrl?: string;
}

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

function formatDate(dateStr: string): string {
  const months = [
    'січня', 'лютого', 'березня', 'квітня', 'травня', 'червня',
    'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня',
  ];
  const days = ['неділя', 'понеділок', 'вівторок', 'середа', 'четвер', "п'ятниця", 'субота'];
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return `${days[date.getDay()]}, ${d} ${months[m - 1]} ${y}`;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} хв`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h} год ${m} хв` : `${h} год`;
}

/**
 * Send booking confirmation email to client.
 */
export async function sendBookingConfirmation(data: BookingConfirmationData): Promise<boolean> {
  if (!resend) {
    console.warn('[EMAIL] RESEND_API_KEY not set — confirmation not sent');
    return false;
  }

  const {
    clientName, clientEmail, salonName, salonAddress, salonPhone,
    serviceName, masterName, date, time, duration, price, cancelUrl,
  } = data;

  const dateFormatted = formatDate(date);
  const durationFormatted = formatDuration(duration);
  const priceFormatted = price ? `${price.toLocaleString('uk-UA')} ₴` : '';

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: clientEmail,
      subject: `✅ Запис підтверджено — ${salonName}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 0;">
          <!-- Header -->
          <div style="background: #1a1a1a; padding: 24px 24px 20px; border-radius: 16px 16px 0 0;">
            <h1 style="color: #fff; font-size: 20px; margin: 0 0 4px;">Запис підтверджено ✓</h1>
            <p style="color: #999; font-size: 14px; margin: 0;">${salonName}</p>
          </div>

          <!-- Body -->
          <div style="background: #f8f8f8; padding: 24px;">
            <p style="color: #333; font-size: 15px; margin: 0 0 20px;">
              Привіт, ${clientName}! Ваш запис успішно створено.
            </p>

            <!-- Booking card -->
            <div style="background: #fff; border-radius: 12px; padding: 20px; border: 1px solid #e5e5e5;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #999; font-size: 13px; width: 100px;">Послуга</td>
                  <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px; font-weight: 600;">${serviceName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #999; font-size: 13px;">Майстер</td>
                  <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px;">${masterName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #999; font-size: 13px;">Дата</td>
                  <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px; font-weight: 600;">${dateFormatted}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #999; font-size: 13px;">Час</td>
                  <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px; font-weight: 600;">${time}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #999; font-size: 13px;">Тривалість</td>
                  <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px;">${durationFormatted}</td>
                </tr>
                ${priceFormatted ? `
                <tr>
                  <td style="padding: 8px 0; color: #999; font-size: 13px;">Вартість</td>
                  <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px; font-weight: 600;">${priceFormatted}</td>
                </tr>
                ` : ''}
              </table>
            </div>

            ${salonAddress || salonPhone ? `
            <!-- Salon info -->
            <div style="margin-top: 16px; padding: 16px; background: #fff; border-radius: 12px; border: 1px solid #e5e5e5;">
              ${salonAddress ? `<p style="color: #666; font-size: 13px; margin: 0 0 4px;">📍 ${salonAddress}</p>` : ''}
              ${salonPhone ? `<p style="color: #666; font-size: 13px; margin: 0;">📞 ${salonPhone}</p>` : ''}
            </div>
            ` : ''}

            ${cancelUrl ? `
            <!-- Cancel link -->
            <div style="margin-top: 20px; text-align: center;">
              <a href="${cancelUrl}" style="color: #999; font-size: 12px; text-decoration: underline;">
                Скасувати запис
              </a>
            </div>
            ` : ''}
          </div>

          <!-- Footer -->
          <div style="background: #f0f0f0; padding: 16px 24px; border-radius: 0 0 16px 16px; text-align: center;">
            <p style="color: #999; font-size: 11px; margin: 0;">
              Цей лист надіслано автоматично. Не відповідайте на нього.
            </p>
          </div>
        </div>
      `,
    });
    return true;
  } catch (error) {
    console.error('[EMAIL] Failed to send booking confirmation:', error);
    return false;
  }
}
