import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET services for master - only master's own services
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const masterId = searchParams.get('masterId');

    if (!masterId) {
      return NextResponse.json({ error: 'masterId required' }, { status: 400 });
    }

    // Get only master's services (through MasterService link)
    const masterServices = await prisma.masterService.findMany({
      where: { masterId },
      include: {
        service: {
          include: {
            category: { select: { name: true } }
          }
        }
      },
      orderBy: { service: { sortOrder: 'asc' } }
    });

    // Format response
    const services = masterServices.map(ms => ({
      id: ms.service.id,
      name: ms.service.name,
      description: ms.service.description,
      duration: ms.customDuration || ms.service.duration,
      price: ms.customPrice ?? ms.service.price,
      basePrice: ms.service.price,
      categoryName: ms.service.category?.name,
      isEnabled: true // All are enabled since they're linked
    }));

    return NextResponse.json(services);
  } catch (error) {
    console.error('Staff services GET error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// PUT - update master's service price/duration
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { masterId, serviceId, customPrice, customDuration } = body;

    if (!masterId || !serviceId) {
      return NextResponse.json({ error: 'masterId and serviceId required' }, { status: 400 });
    }

    // Update price/duration
    await prisma.masterService.update({
      where: {
        masterId_serviceId: { masterId, serviceId }
      },
      data: {
        customPrice: customPrice ?? undefined,
        customDuration: customDuration ?? undefined
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Staff services PUT error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// DELETE - remove service from master
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const masterId = searchParams.get('masterId');
    const serviceId = searchParams.get('serviceId');

    if (!masterId || !serviceId) {
      return NextResponse.json({ error: 'masterId and serviceId required' }, { status: 400 });
    }

    // Remove link
    await prisma.masterService.delete({
      where: {
        masterId_serviceId: { masterId, serviceId }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Staff services DELETE error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
