import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-zа-яіїєґ0-9\s-]/gi, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50)
}

async function getUniqueSlug(baseName: string): Promise<string> {
  let slug = generateSlug(baseName)
  let counter = 0
  
  while (true) {
    const testSlug = counter === 0 ? slug : `${slug}-${counter}`
    const existing = await prisma.salon.findUnique({ where: { slug: testSlug } })
    if (!existing) return testSlug
    counter++
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, name, salonName, phone } = body

    // Валідація
    if (!email || !password || !salonName) {
      return NextResponse.json(
        { error: 'Email, пароль та назва салону обов\'язкові' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Пароль має бути не менше 6 символів' },
        { status: 400 }
      )
    }

    // Перевірка чи email вже існує
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Користувач з таким email вже існує' },
        { status: 400 }
      )
    }

    // Генеруємо унікальний slug для салону
    const slug = await getUniqueSlug(salonName)

    // Хешуємо пароль
    const passwordHash = await bcrypt.hash(password, 10)

    // Створюємо салон і користувача в транзакції
    const result = await prisma.$transaction(async (tx) => {
      // Створюємо салон
      const salon = await tx.salon.create({
        data: {
          name: salonName.trim(),
          slug,
          phone: phone?.trim() || null,
          email: email.toLowerCase().trim(),
          // Дефолтні робочі години
          workingHours: {
            monday: { start: '09:00', end: '20:00', enabled: true },
            tuesday: { start: '09:00', end: '20:00', enabled: true },
            wednesday: { start: '09:00', end: '20:00', enabled: true },
            thursday: { start: '09:00', end: '20:00', enabled: true },
            friday: { start: '09:00', end: '20:00', enabled: true },
            saturday: { start: '10:00', end: '18:00', enabled: true },
            sunday: { start: '10:00', end: '18:00', enabled: false },
          }
        }
      })

      // Створюємо користувача-власника
      const user = await tx.user.create({
        data: {
          email: email.toLowerCase().trim(),
          passwordHash,
          name: name?.trim() || null,
          phone: phone?.trim() || null,
          role: 'SALON_OWNER',
          salonId: salon.id
        }
      })

      // Оновлюємо ownerId салону
      await tx.salon.update({
        where: { id: salon.id },
        data: { ownerId: user.id }
      })

      // Створюємо базові категорії послуг
      await tx.serviceCategory.createMany({
        data: [
          { salonId: salon.id, name: 'Стрижки', sortOrder: 1 },
          { salonId: salon.id, name: 'Борода', sortOrder: 2 },
          { salonId: salon.id, name: 'Комбо', sortOrder: 3 },
        ]
      })

      return { user, salon }
    })

    console.log('[REGISTER] New salon created:', result.salon.name, 'by', result.user.email)

    return NextResponse.json({
      success: true,
      message: 'Акаунт створено успішно',
      salon: {
        id: result.salon.id,
        name: result.salon.name,
        slug: result.salon.slug
      }
    })

  } catch (error) {
    console.error('[REGISTER] Error:', error)
    return NextResponse.json(
      { error: 'Помилка створення акаунту' },
      { status: 500 }
    )
  }
}
