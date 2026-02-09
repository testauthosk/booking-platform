import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';

// GET — list all promo codes
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const promos = await prisma.promoCode.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const summary = {
      total: promos.length,
      active: promos.filter(p => p.isActive).length,
      totalUses: promos.reduce((s, p) => s + p.usedCount, 0),
    };

    return NextResponse.json({ promos, summary });
  } catch (error) {
    console.error('Promo codes error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// POST — create promo code
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { code, description, discountType, discountValue, maxUses, validUntil, targetPlan } = await request.json();

    if (!code) return NextResponse.json({ error: 'code required' }, { status: 400 });

    // Check uniqueness
    const existing = await prisma.promoCode.findUnique({ where: { code: code.toUpperCase() } });
    if (existing) return NextResponse.json({ error: 'Code already exists' }, { status: 400 });

    const promo = await prisma.promoCode.create({
      data: {
        code: code.toUpperCase(),
        description: description || null,
        discountType: discountType || 'percent',
        discountValue: discountValue || 0,
        maxUses: maxUses || 0,
        validUntil: validUntil ? new Date(validUntil) : null,
        targetPlan: targetPlan || null,
      },
    });

    return NextResponse.json(promo);
  } catch (error) {
    console.error('Promo create error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// PUT — update promo code
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id, isActive, description, maxUses, validUntil } = await request.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const data: Record<string, unknown> = {};
    if (isActive !== undefined) data.isActive = isActive;
    if (description !== undefined) data.description = description;
    if (maxUses !== undefined) data.maxUses = maxUses;
    if (validUntil !== undefined) data.validUntil = validUntil ? new Date(validUntil) : null;

    const promo = await prisma.promoCode.update({ where: { id }, data });
    return NextResponse.json(promo);
  } catch (error) {
    console.error('Promo update error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// DELETE — delete promo code
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    await prisma.promoCode.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Promo delete error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
