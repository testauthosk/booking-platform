import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Resend } from 'resend';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// POST /api/invitations/[id]/resend - повторна відправка запрошення (owner only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const invitation = await prisma.staffInvitation.findUnique({
      where: { id },
    });

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { salonId: true },
    });
    if (invitation.salonId !== user?.salonId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Получаем данные салона
    const salon = await prisma.salon.findUnique({
      where: { id: invitation.salonId },
    });

    if (invitation.isUsed) {
      return NextResponse.json({ error: 'Invitation already used' }, { status: 400 });
    }

    // Продлеваем срок действия на 7 дней
    const updatedInvitation = await prisma.staffInvitation.update({
      where: { id },
      data: {
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
          to: invitation.email,
          subject: `${salonName} запрошує вас приєднатися до команди`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              ${salonLogo ? `
                <div style="text-align: center; margin-bottom: 32px;">
                  <img src="${salonLogo}" alt="${salonName}" style="max-width: 120px; max-height: 120px; border-radius: 12px;" />
                </div>
              ` : ''}
              
              <h1 style="font-size: 24px; font-weight: 600; color: #111; margin-bottom: 24px; text-align: center;">
                Вітаємо${invitation.name ? ', ' + invitation.name : ''}! 👋
              </h1>
              
              <p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 16px; text-align: center;">
                <strong>${salonName}</strong> запрошує вас приєднатися до команди${invitation.role ? ' на посаду <strong>' + invitation.role + '</strong>' : ''}.
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
          where: { id },
          data: { emailSentAt: new Date() }
        });
        console.log(`Resend email sent to ${invitation.email} from ${salonName}`);
      } catch (emailError) {
        console.error('Email send error:', emailError);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Invitation resent',
      invitation: updatedInvitation 
    });
  } catch (error) {
    console.error('POST /api/invitations/[id]/resend error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
