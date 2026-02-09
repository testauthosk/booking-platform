import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyReviewToken } from '@/lib/review-token';

// GET — fetch booking info for review page
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const bookingId = searchParams.get('bookingId');
  const token = searchParams.get('token');

  if (!bookingId || !token) {
    return NextResponse.json({ error: 'Невірні параметри' }, { status: 400 });
  }

  if (!verifyReviewToken(bookingId, token)) {
    return NextResponse.json({ error: 'Невірне посилання' }, { status: 403 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      serviceName: true,
      masterName: true,
      date: true,
      time: true,
      clientName: true,
      status: true,
      salon: { select: { name: true, logo: true } },
      review: { select: { id: true } },
    },
  });

  if (!booking) {
    return NextResponse.json({ error: 'Запис не знайдено' }, { status: 404 });
  }

  if (booking.review) {
    return NextResponse.json({ error: 'Відгук вже залишено', alreadyReviewed: true }, { status: 400 });
  }

  return NextResponse.json({
    bookingId: booking.id,
    serviceName: booking.serviceName,
    masterName: booking.masterName,
    date: booking.date,
    time: booking.time,
    clientName: booking.clientName,
    salonName: booking.salon?.name,
    salonLogo: booking.salon?.logo,
  });
}

// POST — submit review
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingId, token, rating, text } = body;

    if (!bookingId || !token) {
      return NextResponse.json({ error: 'Невірні параметри' }, { status: 400 });
    }

    if (!verifyReviewToken(bookingId, token)) {
      return NextResponse.json({ error: 'Невірне посилання' }, { status: 403 });
    }

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Оцінка від 1 до 5' }, { status: 400 });
    }

    const reviewText = text ? String(text).trim().substring(0, 1000) : null;

    // Check booking exists and no review yet
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        salonId: true,
        clientId: true,
        clientName: true,
        masterId: true,
        serviceName: true,
        review: { select: { id: true } },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Запис не знайдено' }, { status: 404 });
    }

    if (booking.review) {
      return NextResponse.json({ error: 'Відгук вже залишено' }, { status: 400 });
    }

    // Generate author initial and color
    const name = booking.clientName || 'Клієнт';
    const initial = name.substring(0, 2).toUpperCase();
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-amber-500', 'bg-pink-500', 'bg-teal-500'];
    const color = colors[Math.abs(name.charCodeAt(0)) % colors.length];

    const review = await prisma.review.create({
      data: {
        salonId: booking.salonId,
        bookingId: booking.id,
        clientId: booking.clientId,
        masterId: booking.masterId,
        authorName: name,
        authorInitial: initial,
        authorColor: color,
        rating,
        text: reviewText,
        serviceName: booking.serviceName,
        isVisible: true, // visible by default, owner can hide
      },
    });

    // Update salon rating
    const stats = await prisma.review.aggregate({
      where: { salonId: booking.salonId, isVisible: true },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await prisma.salon.update({
      where: { id: booking.salonId },
      data: {
        rating: stats._avg.rating ? parseFloat(stats._avg.rating.toFixed(1)) : 5.0,
        reviewCount: stats._count.rating,
      },
    }).catch(console.error);

    return NextResponse.json({ id: review.id }, { status: 201 });
  } catch (error) {
    console.error('Create review error:', error);
    return NextResponse.json({ error: 'Внутрішня помилка' }, { status: 500 });
  }
}
