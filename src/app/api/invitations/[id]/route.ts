import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';

async function verifyInvitationOwnership(invitationId: string, userId: string) {
  const invitation = await prisma.staffInvitation.findUnique({
    where: { id: invitationId },
    select: { salonId: true },
  });
  if (!invitation) return { error: 'Not found', status: 404 };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { salonId: true },
  });
  if (invitation.salonId !== user?.salonId) return { error: 'Forbidden', status: 403 };

  return { salonId: invitation.salonId };
}

// GET /api/invitations/[id] - деталі запрошення (owner only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const check = await verifyInvitationOwnership(id, session.user.id);
    if ('error' in check) {
      return NextResponse.json({ error: check.error }, { status: check.status });
    }

    const invitation = await prisma.staffInvitation.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isUsed: true,
        expiresAt: true,
        createdAt: true,
        emailSentAt: true,
      },
    });

    return NextResponse.json(invitation);
  } catch (error) {
    console.error('GET /api/invitations/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/invitations/[id] - скасувати запрошення (owner only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const check = await verifyInvitationOwnership(id, session.user.id);
    if ('error' in check) {
      return NextResponse.json({ error: check.error }, { status: check.status });
    }

    const invitation = await prisma.staffInvitation.findUnique({
      where: { id },
      select: { isUsed: true },
    });

    if (invitation?.isUsed) {
      return NextResponse.json({ error: 'Invitation already used' }, { status: 400 });
    }

    await prisma.staffInvitation.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/invitations/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
