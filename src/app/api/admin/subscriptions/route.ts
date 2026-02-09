import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/prisma';

// Plan prices for MRR calculation
const PLAN_PRICES: Record<string, number> = {
  free: 0,
  pro: 299,
  business: 599,
};

// GET - list all subscriptions
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const plan = searchParams.get('plan');
    const search = searchParams.get('search');

    const where: Record<string, unknown> = {};
    
    if (plan) {
      where.plan = plan;
    }

    if (search) {
      where.salon = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { slug: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const [subscriptions, total, stats] = await Promise.all([
      prisma.subscription.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          salon: {
            select: {
              id: true,
              name: true,
              slug: true,
              isActive: true,
              createdAt: true,
              ownerId: true,
            },
          },
        },
      }),
      prisma.subscription.count({ where }),
      Promise.all([
        prisma.subscription.count({ where: { plan: 'free' } }),
        prisma.subscription.count({ where: { plan: 'pro' } }),
        prisma.subscription.count({ where: { plan: 'business' } }),
        prisma.subscription.count({ where: { status: 'active' } }),
        prisma.subscription.findMany({
          where: { status: 'active' },
          select: { plan: true },
        }),
      ]),
    ]);

    // Calculate MRR
    const activeSubscriptions = stats[4];
    const mrr = activeSubscriptions.reduce((sum, sub) => sum + (PLAN_PRICES[sub.plan] || 0), 0);

    // Count salons without subscriptions
    const salonsWithoutSub = await prisma.salon.count({
      where: {
        subscription: null,
      },
    });

    return NextResponse.json({
      subscriptions,
      total,
      page,
      stats: {
        free: stats[0],
        pro: stats[1],
        business: stats[2],
        active: stats[3],
        mrr,
        salonsWithoutSubscription: salonsWithoutSub,
      },
    });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// PUT - update subscription
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id, salonId, plan, status, currentPeriodStart, currentPeriodEnd } = await req.json();

    // If no subscription exists, create one
    if (!id && salonId) {
      const subscription = await prisma.subscription.create({
        data: {
          salonId,
          plan: plan || 'free',
          status: status || 'active',
          currentPeriodStart: currentPeriodStart ? new Date(currentPeriodStart) : new Date(),
          currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd) : null,
        },
        include: {
          salon: { select: { id: true, name: true, slug: true } },
        },
      });

      return NextResponse.json(subscription);
    }

    // Update existing subscription
    const data: Record<string, unknown> = {};
    if (plan !== undefined) data.plan = plan;
    if (status !== undefined) data.status = status;
    if (currentPeriodStart !== undefined) data.currentPeriodStart = new Date(currentPeriodStart);
    if (currentPeriodEnd !== undefined) data.currentPeriodEnd = currentPeriodEnd ? new Date(currentPeriodEnd) : null;

    const subscription = await prisma.subscription.update({
      where: { id },
      data,
      include: {
        salon: { select: { id: true, name: true, slug: true } },
      },
    });

    // Log the change
    await prisma.auditLog.create({
      data: {
        salonId: subscription.salonId,
        actorType: 'ADMIN',
        actorId: session.user.id,
        actorName: session.user.email || 'Super Admin',
        action: 'UPDATE',
        entityType: 'SUBSCRIPTION',
        entityId: subscription.id,
        changes: { plan, status, currentPeriodStart, currentPeriodEnd },
      },
    });

    return NextResponse.json(subscription);
  } catch (error) {
    console.error('Error updating subscription:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// POST - create subscription for salon
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { salonId, plan } = await req.json();

    if (!salonId) {
      return NextResponse.json({ error: 'salonId is required' }, { status: 400 });
    }

    // Check if subscription already exists
    const existing = await prisma.subscription.findUnique({
      where: { salonId },
    });

    if (existing) {
      return NextResponse.json({ error: 'Subscription already exists' }, { status: 400 });
    }

    const subscription = await prisma.subscription.create({
      data: {
        salonId,
        plan: plan || 'free',
        status: 'active',
        currentPeriodStart: new Date(),
      },
      include: {
        salon: { select: { id: true, name: true, slug: true } },
      },
    });

    return NextResponse.json(subscription);
  } catch (error) {
    console.error('Error creating subscription:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
