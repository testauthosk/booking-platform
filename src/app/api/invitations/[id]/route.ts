import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/invitations/[id] - детали приглашения
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const invitation = await prisma.staffInvitation.findUnique({
      where: { id: params.id },
    });

    if (!invitation) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(invitation);
  } catch (error) {
    console.error('GET /api/invitations/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/invitations/[id] - удалить/отменить приглашение
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const invitation = await prisma.staffInvitation.findUnique({
      where: { id: params.id },
    });

    if (!invitation) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (invitation.isUsed) {
      return NextResponse.json({ error: 'Invitation already used' }, { status: 400 });
    }

    await prisma.staffInvitation.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/invitations/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
