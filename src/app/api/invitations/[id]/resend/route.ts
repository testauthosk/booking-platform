import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// POST /api/invitations/[id]/resend - повторная отправка приглашения
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Находим приглашение
    const invitation = await prisma.staffInvitation.findUnique({
      where: { id },
    });

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

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

    // Отправляем email если настроен Resend
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://booking-platform-ruddy.vercel.app'}/join/${invitation.token}`;
    
    if (resend) {
      try {
        await resend.emails.send({
          from: 'Booking Platform <onboarding@resend.dev>',
          to: invitation.email,
          subject: `Запрошення до команди`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Вітаємо${invitation.name ? ', ' + invitation.name : ''}!</h2>
              <p>Вас запрошено приєднатися до команди${invitation.role ? ' на посаду ' + invitation.role : ''}.</p>
              <p>Для створення акаунту перейдіть за посиланням:</p>
              <p><a href="${inviteUrl}" style="display: inline-block; padding: 12px 24px; background: #000; color: #fff; text-decoration: none; border-radius: 8px;">Приєднатися</a></p>
              <p style="color: #666; font-size: 14px;">Посилання дійсне 7 днів.</p>
            </div>
          `,
        });
        console.log(`Email sent to ${invitation.email}`);
      } catch (emailError) {
        console.error('Email send error:', emailError);
        // Не фейлим запрос если email не отправился
      }
    } else {
      console.log(`[No Resend API Key] Would send email to ${invitation.email}, link: ${inviteUrl}`);
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
