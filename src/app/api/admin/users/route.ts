import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import bcrypt from 'bcryptjs';

// GET - all users and masters
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type'); // 'admin' | 'master' | null (all)
    const search = searchParams.get('search');
    const salonId = searchParams.get('salonId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Get admins (users)
    const adminWhere: any = {};
    if (salonId) adminWhere.salonId = salonId;
    if (search) {
      adminWhere.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get masters
    const masterWhere: any = {};
    if (salonId) masterWhere.salonId = salonId;
    if (search) {
      masterWhere.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ];
    }

    const [admins, masters, totalAdmins, totalMasters] = await Promise.all([
      type !== 'master' ? prisma.user.findMany({
        where: adminWhere,
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          salonId: true,
          createdAt: true,
          notificationsEnabled: true,
          telegramChatId: true,
          salon: { select: { id: true, name: true, slug: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: type === 'admin' ? (page - 1) * limit : 0,
        take: type === 'admin' ? limit : 1000,
      }) : [],
      type !== 'admin' ? prisma.master.findMany({
        where: masterWhere,
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          salonId: true,
          createdAt: true,
          isActive: true,
          rating: true,
          reviewCount: true,
          lastLogin: true,
          salon: { select: { id: true, name: true, slug: true } },
          _count: { select: { bookings: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: type === 'master' ? (page - 1) * limit : 0,
        take: type === 'master' ? limit : 1000,
      }) : [],
      prisma.user.count({ where: adminWhere }),
      prisma.master.count({ where: masterWhere }),
    ]);

    // Combine and format
    const users = [
      ...admins.map(u => ({ ...u, userType: 'admin' as const })),
      ...masters.map(m => ({ ...m, userType: 'master' as const })),
    ];

    // Sort by createdAt if mixed
    if (!type) {
      users.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return NextResponse.json({
      users: type ? users : users.slice((page - 1) * limit, page * limit),
      total: type === 'admin' ? totalAdmins : type === 'master' ? totalMasters : totalAdmins + totalMasters,
      totalAdmins,
      totalMasters,
      page,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

// POST - create user or master
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { userType, email, password, name, phone, role, salonId } = body;

    if (userType === 'admin') {
      // Create user (admin)
      const passwordHash = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          name,
          phone,
          role: role || 'SALON_OWNER',
          salonId,
        },
      });
      return NextResponse.json(user);
    } else {
      // Create master
      const passwordHash = password ? await bcrypt.hash(password, 10) : null;
      const master = await prisma.master.create({
        data: {
          email,
          passwordHash,
          name,
          phone,
          role: role || 'Майстер',
          salonId,
        },
      });
      return NextResponse.json(master);
    }
  } catch (error: any) {
    console.error('Error creating user:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Email вже використовується' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}

// PUT - update user or master
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, userType, password, ...data } = body;

    if (userType === 'admin') {
      const updateData: any = { ...data };
      if (password) {
        updateData.passwordHash = await bcrypt.hash(password, 10);
      }
      const user = await prisma.user.update({
        where: { id },
        data: updateData,
      });
      return NextResponse.json(user);
    } else {
      const updateData: any = { ...data };
      if (password) {
        updateData.passwordHash = await bcrypt.hash(password, 10);
      }
      const master = await prisma.master.update({
        where: { id },
        data: updateData,
      });
      return NextResponse.json(master);
    }
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

// DELETE - delete user or master
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const userType = searchParams.get('userType');

    if (!id || !userType) {
      return NextResponse.json({ error: 'Missing id or userType' }, { status: 400 });
    }

    if (userType === 'admin') {
      await prisma.user.delete({ where: { id } });
    } else {
      await prisma.master.delete({ where: { id } });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
