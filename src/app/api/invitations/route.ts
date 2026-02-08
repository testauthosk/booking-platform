import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// GET /api/invitations - список приглашений
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const salonId = searchParams.get('salonId');

    if (!salonId) {
      return NextResponse.json({ error: 'salonId required' }, { status: 400 });
    }

    const invitations = await prisma.staffInvitation.findMany({
      where: { salonId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(invitations);
  } catch (error) {
    console.error('GET /api/invitations error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/invitations - создать приглашение
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { salonId, email, name, role } = body;

    if (!salonId || !email) {
      return NextResponse.json({ error: 'salonId and email required' }, { status: 400 });
    }

    // Получаем данные салона
    const salon = await prisma.salon.findUnique({
      where: { id: salonId },
    });

    // Перевіряємо чи онбордінг завершено
    if (salon && !salon.onboardingCompleted) {
      return NextResponse.json(
        { error: 'Завершіть налаштування акаунту перед запрошенням майстрів', code: 'ONBOARDING_REQUIRED' },
        { status: 403 }
      );
    }

    // Проверяем нет ли уже активного приглашения
    const existing = await prisma.staffInvitation.findFirst({
      where: {
        salonId,
        email,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (existing) {
      return NextResponse.json({ error: 'Active invitation already exists' }, { status: 400 });
    }

    // Проверяем нет ли уже мастера с таким email
    const existingMaster = await prisma.master.findFirst({
      where: { salonId, email },
    });

    if (existingMaster) {
      return NextResponse.json({ error: 'Master with this email already exists' }, { status: 400 });
    }

    // Создаём приглашение (действует 7 дней)
    const invitation = await prisma.staffInvitation.create({
      data: {
        salonId,
        email,
        name,
        role,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Отправляем email
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://booking-platform-production-7d5d.up.railway.app'}/join/${invitation.token}`;
    const salonName = salon?.name || 'салону';
    const salonLogo = salon?.logo;
    
    if (resend) {
      try {
        await resend.emails.send({
          from: `${salonName} <onboarding@resend.dev>`,
          to: email,
          subject: `${salonName} запрошує вас приєднатися до команди`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              ${salonLogo ? `
                <div style="text-align: center; margin-bottom: 32px;">
                  <img src="${salonLogo}" alt="${salonName}" style="max-width: 120px; max-height: 120px; border-radius: 12px;" />
                </div>
              ` : ''}
              
              <h1 style="font-size: 24px; font-weight: 600; color: #111; margin-bottom: 24px; text-align: center;">
                Вітаємо${name ? ', ' + name : ''}! 👋
              </h1>
              
              <p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 16px; text-align: center;">
                <strong>${salonName}</strong> запрошує вас приєднатися до команди${role ? ' на посаду <strong>' + role + '</strong>' : ''}.
              </p>
              
              <p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 32px; text-align: center;">
                Натисніть кнопку нижче, щоб створити акаунт:
              </p>
              
              <div style="text-align: center;">
                <a href="${inviteUrl}" style="display: inline-block; padding: 14px 32px; background: #111; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 16px;">
                  Приєднатися
                </a>
              </div>
              
              <p style="font-size: 14px; color: #666; margin-top: 32px; line-height: 1.5; text-align: center;">
                Посилання дійсне 7 днів.<br>
                Якщо ви не очікували цей лист — просто проігноруйте його.
              </p>
            </div>
          `,
        });
        // Оновлюємо emailSentAt
        await prisma.staffInvitation.update({
          where: { id: invitation.id },
          data: { emailSentAt: new Date() }
        });
        console.log(`Invitation email sent to ${email} from ${salonName}`);
      } catch (emailError) {
        console.error('Email send error:', emailError);
      }
    }

    return NextResponse.json(invitation);
  } catch (error) {
    console.error('POST /api/invitations error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
