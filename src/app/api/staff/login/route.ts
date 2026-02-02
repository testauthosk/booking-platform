import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'staff-secret-key-change-in-production'
);

// POST /api/staff/login - авторизация мастера
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    // Находим мастера
    const master = await prisma.master.findFirst({
      where: { email, isActive: true },
    });

    if (!master || !master.passwordHash) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Проверяем пароль
    const valid = await bcrypt.compare(password, master.passwordHash);

    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Обновляем lastLogin
    await prisma.master.update({
      where: { id: master.id },
      data: { lastLogin: new Date() },
    });

    // Создаём JWT токен
    const token = await new SignJWT({
      masterId: master.id,
      salonId: master.salonId,
      email: master.email,
      type: 'staff',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d')
      .sign(JWT_SECRET);

    return NextResponse.json({
      token,
      master: {
        id: master.id,
        name: master.name,
        email: master.email,
        role: master.role,
        avatar: master.avatar,
        salonId: master.salonId,
      },
    });
  } catch (error) {
    console.error('POST /api/staff/login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
