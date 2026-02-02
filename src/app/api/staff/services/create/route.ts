import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// POST - create new service by master
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { salonId, masterId, name, duration, price, description } = body;

    if (!salonId || !masterId || !name || !price) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create service in salon
    const service = await prisma.service.create({
      data: {
        salonId,
        name,
        duration: duration || 30,
        price,
        description: description || null,
        sortOrder: 999, // Add to end
      }
    });

    // Link to master with same price
    await prisma.masterService.create({
      data: {
        masterId,
        serviceId: service.id,
        customPrice: price
      }
    });

    return NextResponse.json({ 
      success: true, 
      service: {
        id: service.id,
        name: service.name,
        duration: service.duration,
        price: service.price
      }
    });
  } catch (error) {
    console.error('Create service error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
