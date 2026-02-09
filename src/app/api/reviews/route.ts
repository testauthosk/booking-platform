import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions as authConfig } from '@/lib/auth-config';
import prisma from '@/lib/prisma';

// GET — list reviews for salon owner
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
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

    const reviews = await prisma.review.findMany({
      where: { salonId: user.salonId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        authorName: true,
        authorInitial: true,
        authorColor: true,
        rating: true,
        text: true,
        serviceName: true,
        isVisible: true,
        createdAt: true,
        master: { select: { name: true } },
      },
    });

    return NextResponse.json(reviews);
  } catch (error) {
    console.error('Reviews GET error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// PATCH — toggle review visibility (moderation)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
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

    const { reviewId, isVisible } = await request.json();
    if (!reviewId || typeof isVisible !== 'boolean') {
      return NextResponse.json({ error: 'reviewId and isVisible required' }, { status: 400 });
    }

    // Verify review belongs to salon
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      select: { salonId: true },
    });
    if (!review || review.salonId !== user.salonId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const updated = await prisma.review.update({
      where: { id: reviewId },
      data: { isVisible },
    });

    // Recalculate salon rating
    const stats = await prisma.review.aggregate({
      where: { salonId: user.salonId, isVisible: true },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await prisma.salon.update({
      where: { id: user.salonId },
      data: {
        rating: stats._avg.rating ? parseFloat(stats._avg.rating.toFixed(1)) : 5.0,
        reviewCount: stats._count.rating,
      },
    }).catch(console.error);

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Reviews PATCH error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
