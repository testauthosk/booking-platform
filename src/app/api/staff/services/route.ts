import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET services for master
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const masterId = searchParams.get('masterId');

    if (!masterId) {
      return NextResponse.json({ error: 'masterId required' }, { status: 400 });
    }

    // Get master's salon
    const master = await prisma.master.findUnique({
      where: { id: masterId },
      select: { salonId: true }
    });

    if (!master) {
      return NextResponse.json({ error: 'Master not found' }, { status: 404 });
    }

    // Get all salon services
    const salonServices = await prisma.service.findMany({
      where: { salonId: master.salonId },
      include: {
        category: { select: { name: true } }
      },
      orderBy: [{ category: { sortOrder: 'asc' } }, { sortOrder: 'asc' }]
    });

    // Get master's enabled services with custom prices
    const masterServices = await prisma.masterService.findMany({
      where: { masterId },
      select: { serviceId: true, customPrice: true, customDuration: true }
    });

    const masterServiceMap = new Map(
      masterServices.map(ms => [ms.serviceId, ms])
    );

    // Combine data
    const services = salonServices.map(service => {
      const masterService = masterServiceMap.get(service.id);
      return {
        id: service.id,
        name: service.name,
        description: service.description,
        duration: masterService?.customDuration || service.duration,
        price: masterService?.customPrice ?? service.price,
        basePrice: service.price,
        categoryName: service.category?.name,
        isEnabled: masterServiceMap.has(service.id)
      };
    });

    return NextResponse.json(services);
  } catch (error) {
    console.error('Staff services GET error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// PUT toggle service or update price for master
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { masterId, serviceId, enabled, customPrice, customDuration } = body;

    if (!masterId || !serviceId) {
      return NextResponse.json({ error: 'masterId and serviceId required' }, { status: 400 });
    }

    if (enabled === false) {
      // Disable service - remove link
      await prisma.masterService.deleteMany({
        where: { masterId, serviceId }
      });
    } else {
      // Enable or update service
      const updateData: Record<string, unknown> = {};
      if (customPrice !== undefined) updateData.customPrice = customPrice;
      if (customDuration !== undefined) updateData.customDuration = customDuration;

      await prisma.masterService.upsert({
        where: {
          masterId_serviceId: { masterId, serviceId }
        },
        create: { 
          masterId, 
          serviceId,
          customPrice: customPrice ?? null,
          customDuration: customDuration ?? null
        },
        update: updateData
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Staff services PUT error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
