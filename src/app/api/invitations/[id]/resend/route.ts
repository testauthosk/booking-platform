import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

    // TODO: Здесь можно добавить отправку email через Resend/SendGrid/etc
    // await sendInvitationEmail(invitation.email, invitation.token);

    console.log(`Resend invitation to ${invitation.email}, token: ${invitation.token}`);

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
