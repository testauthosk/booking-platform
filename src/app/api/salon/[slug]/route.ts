import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const salon = await prisma.salon.findUnique({
      where: { slug, isActive: true },
      include: {
        categories: {
          orderBy: { sortOrder: 'asc' },
          include: {
            services: {
              where: { isActive: true },
              orderBy: { sortOrder: 'asc' }
            }
          }
        },
        masters: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' }
        },
        reviews: {
          where: { isVisible: true },
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!salon) {
      return NextResponse.json({ error: 'Salon not found' }, { status: 404 });
    }

    // Transform to expected format
    const result = {
      ...salon,
      // Map to old field names for compatibility
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
        }))
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
      }))
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching salon:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
