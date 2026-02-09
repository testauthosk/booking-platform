import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/salon/[slug] — публічна сторінка салону
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const salon = await prisma.salon.findUnique({
      where: { slug, isActive: true },
      select: {
        // Only public-safe fields
        id: true,
        onboardingCompleted: true,
        name: true,
        slug: true,
        type: true,
        description: true,
        phone: true,
        email: true,
        address: true,
        shortAddress: true,
        latitude: true,
        longitude: true,
        logo: true,
        photos: true,
        workingHours: true,
        amenities: true,
        timezone: true,
        currency: true,
        rating: true,
        reviewCount: true,
        paletteId: true,
        // Relations with safe selects
        categories: {
          orderBy: { sortOrder: 'asc' as const },
          include: {
            services: {
              where: { isActive: true },
              orderBy: { sortOrder: 'asc' as const },
              select: {
                id: true,
                name: true,
                description: true,
                price: true,
                priceFrom: true,
                duration: true,
                isActive: true,
              },
            },
          },
        },
        masters: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' as const },
          select: {
            id: true,
            name: true,
            role: true,
            avatar: true,
            rating: true,
            reviewCount: true,
            price: true,
          },
        },
        reviews: {
          where: { isVisible: true },
          orderBy: { createdAt: 'desc' as const },
          take: 10,
          select: {
            id: true,
            authorName: true,
            authorInitial: true,
            authorColor: true,
            rating: true,
            text: true,
            serviceName: true,
            createdAt: true,
          },
        },
      },
    });

    if (!salon) {
      return NextResponse.json({ error: 'Salon not found' }, { status: 404 });
    }

    // Block unpublished salons for public visitors
    // Allow preview for authenticated salon owners
    if (!salon.onboardingCompleted) {
      const { getServerSession } = await import('next-auth');
      const { authOptions } = await import('@/lib/auth-config');
      const session = await getServerSession(authOptions);
      const isOwner = session?.user?.salonId === salon.id;
      if (!isOwner) {
        return NextResponse.json({ error: 'Salon not found' }, { status: 404 });
      }
    }

    // Transform to expected format — exclude internal fields
    const { onboardingCompleted: _, ...publicSalon } = salon;
    const result = {
      ...publicSalon,
      short_address: salon.shortAddress,
      working_hours: salon.workingHours,
      review_count: salon.reviewCount,
      coordinates_lat: salon.latitude,
      coordinates_lng: salon.longitude,
      services: salon.categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        sort_order: cat.sortOrder,
        items: cat.services.map(s => ({
          id: s.id,
          name: s.name,
          description: s.description,
          price: s.price,
          price_from: s.priceFrom,
          duration: `${s.duration} хв`,
          duration_minutes: s.duration,
          is_active: s.isActive,
        })),
      })),
      masters: salon.masters.map(m => ({
        id: m.id,
        name: m.name,
        role: m.role,
        avatar: m.avatar,
        rating: m.rating,
        review_count: m.reviewCount,
        price: m.price,
      })),
      reviews: salon.reviews.map(r => ({
        id: r.id,
        author_name: r.authorName,
        author_initial: r.authorInitial,
        author_color: r.authorColor,
        rating: r.rating,
        text: r.text,
        service_name: r.serviceName,
        created_at: r.createdAt,
      })),
    };

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, max-age=30, stale-while-revalidate=60',
      },
    });
  } catch (error) {
    console.error('Error fetching salon:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
