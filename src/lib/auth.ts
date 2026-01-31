import { getServerSession } from 'next-auth'
import { authOptions } from './auth-config'
import prisma from './prisma'
import bcrypt from 'bcryptjs'

export type UserRole = 'SUPER_ADMIN' | 'SALON_OWNER' | 'MASTER'

export interface AuthUser {
  id: string
  email: string
  name: string | null
  role: UserRole
  salonId: string | null
  telegramChatId: string | null
  notificationsEnabled: boolean
}

// Get current user from session
export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) return null

  const user = await prisma.user.findUnique({
    where: { id: session.user.id }
  })

  if (!user) return null

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as UserRole,
    salonId: user.salonId,
    telegramChatId: user.telegramChatId,
    notificationsEnabled: user.notificationsEnabled,
  }
}

// Check if user is super admin
export async function isSuperAdmin(): Promise<boolean> {
  const user = await getCurrentUser()
  return user?.role === 'SUPER_ADMIN'
}

// Check if user owns a specific salon
export async function ownsSalon(salonId: string): Promise<boolean> {
  const user = await getCurrentUser()
  if (!user) return false
  if (user.role === 'SUPER_ADMIN') return true
  return user.salonId === salonId
}

// Create new user (admin function)
export async function createUser(
  email: string,
  password: string,
  role: UserRole = 'SALON_OWNER',
  salonId?: string
): Promise<{ success: boolean; error?: string; userId?: string }> {
  try {
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return { success: false, error: 'User already exists' }
    }

    const passwordHash = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role,
        salonId,
      }
    })

    return { success: true, userId: user.id }
  } catch (error) {
    return { success: false, error: 'Failed to create user' }
  }
}

// Check salon is active
export async function isSalonActive(salonId: string): Promise<boolean> {
  const salon = await prisma.salon.findUnique({
    where: { id: salonId },
    select: { isActive: true }
  })
  return salon?.isActive ?? false
}

// Check salon is active by slug
export async function isSalonActiveBySlug(slug: string): Promise<boolean> {
  const salon = await prisma.salon.findUnique({
    where: { slug },
    select: { isActive: true }
  })
  return salon?.isActive ?? false
}

// Toggle salon active status (super admin only)
export async function toggleSalonActive(salonId: string, isActive: boolean): Promise<boolean> {
  try {
    await prisma.salon.update({
      where: { id: salonId },
      data: { isActive }
    })
    return true
  } catch {
    return false
  }
}

// Get all salons (super admin only)
export async function getAllSalons() {
  return prisma.salon.findMany({
    include: {
      users: {
        where: { role: 'SALON_OWNER' },
        select: { email: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  })
}
