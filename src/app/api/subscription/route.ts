import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import prisma from '@/lib/prisma';
import { PLAN_LIMITS, PLAN_NAMES, PLAN_PRICES, type Plan } from '@/lib/subscription';

// GET — get current subscription
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { salonId: true },
    });
    if (!user?.salonId) {
      return NextResponse.json({ error: 'No salon' }, { status: 400 });
    }

    const sub = await prisma.subscription.findUnique({
      where: { salonId: user.salonId },
    });

    const plan: Plan = (sub?.status === 'active' && sub?.plan as Plan) || 'free';

    return NextResponse.json({
      plan,
      planName: PLAN_NAMES[plan],
      price: PLAN_PRICES[plan],
      limits: PLAN_LIMITS[plan],
      subscription: sub ? {
        status: sub.status,
        currentPeriodEnd: sub.currentPeriodEnd,
        cancelledAt: sub.cancelledAt,
      } : null,
    });
  } catch (error) {
    console.error('Subscription GET error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
