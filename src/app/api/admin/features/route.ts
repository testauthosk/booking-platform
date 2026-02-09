import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';

// GET — list all feature flags
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const flags = await prisma.featureFlag.findMany({
      orderBy: { key: 'asc' },
    });

    return NextResponse.json({ flags });
  } catch (error) {
    console.error('Feature flags error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// POST — create feature flag
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { key, name, description, enabled, rolloutPct } = await request.json();
    if (!key || !name) return NextResponse.json({ error: 'key and name required' }, { status: 400 });

    const existing = await prisma.featureFlag.findUnique({ where: { key } });
    if (existing) return NextResponse.json({ error: 'Key already exists' }, { status: 400 });

    const flag = await prisma.featureFlag.create({
      data: {
        key,
        name,
        description: description || null,
        enabled: enabled ?? false,
        rolloutPct: rolloutPct ?? 0,
      },
    });

    return NextResponse.json(flag);
  } catch (error) {
    console.error('Feature flag create error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// PUT — update feature flag
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id, enabled, rolloutPct, salonIds, name, description } = await request.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const data: Record<string, unknown> = {};
    if (enabled !== undefined) data.enabled = enabled;
    if (rolloutPct !== undefined) data.rolloutPct = rolloutPct;
    if (salonIds !== undefined) data.salonIds = salonIds;
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;

    const flag = await prisma.featureFlag.update({ where: { id }, data });
    return NextResponse.json(flag);
  } catch (error) {
    console.error('Feature flag update error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// DELETE — delete feature flag
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    await prisma.featureFlag.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Feature flag delete error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
