import prisma from './prisma'

// ==================== TYPES ====================

export interface SalonWithRelations {
  id: string
  name: string
  slug: string
  type: string
  description: string | null
  phone: string | null
  email: string | null
  address: string | null
  shortAddress: string | null
  latitude: number | null
  longitude: number | null
  photos: string[]
  workingHours: any
  amenities: string[]
  rating: number
  reviewCount: number
  isActive: boolean
  services: Array<{
    id: string
    name: string
    sortOrder: number
    items: Array<{
      id: string
      name: string
      description: string | null
      price: number
      priceFrom: boolean
      duration: number
      isActive: boolean
    }>
  }>
  masters: Array<{
    id: string
    name: string
    role: string | null
    avatar: string | null
    rating: number
    reviewCount: number
    price: number
  }>
  reviews: Array<{
    id: string
    authorName: string
    authorInitial: string
    authorColor: string
    rating: number
    text: string | null
    serviceName: string | null
    createdAt: Date
  }>
}

// ==================== SALON ====================

export async function getSalonBySlug(slug: string): Promise<SalonWithRelations | null> {
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
  })

  if (!salon) return null

  return {
    ...salon,
    services: salon.categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      sortOrder: cat.sortOrder,
      items: cat.services.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description,
        price: s.price,
        priceFrom: s.priceFrom,
        duration: s.duration,
        isActive: s.isActive,
      }))
    })),
    masters: salon.masters.map(m => ({
      id: m.id,
      name: m.name,
      role: m.role,
      avatar: m.avatar,
      rating: m.rating,
      reviewCount: m.reviewCount,
      price: m.price,
    })),
    reviews: salon.reviews.map(r => ({
      id: r.id,
      authorName: r.authorName,
      authorInitial: r.authorInitial,
      authorColor: r.authorColor,
      rating: r.rating,
      text: r.text,
      serviceName: r.serviceName,
      createdAt: r.createdAt,
    }))
  }
}

export async function getSalonById(id: string) {
  return prisma.salon.findUnique({
    where: { id }
  })
}

// ==================== SERVICES ====================

export async function getServicesBySalon(salonId: string) {
  const categories = await prisma.serviceCategory.findMany({
    where: { salonId },
    orderBy: { sortOrder: 'asc' },
    include: {
      services: {
        orderBy: { sortOrder: 'asc' }
      }
    }
  })

  return categories.map(cat => ({
    ...cat,
    items: cat.services
  }))
}

export async function createService(data: {
  salonId: string
  categoryId?: string
  name: string
  description?: string
  price: number
  priceFrom?: boolean
  duration?: number
}) {
  return prisma.service.create({
    data: {
      salonId: data.salonId,
      categoryId: data.categoryId,
      name: data.name,
      description: data.description,
      price: data.price,
      priceFrom: data.priceFrom ?? false,
      duration: data.duration ?? 30,
    }
  })
}

export async function updateService(serviceId: string, data: Partial<{
  name: string
  description: string
  price: number
  priceFrom: boolean
  duration: number
  isActive: boolean
  categoryId: string
  sortOrder: number
}>) {
  return prisma.service.update({
    where: { id: serviceId },
    data
  })
}

export async function deleteService(serviceId: string) {
  await prisma.service.delete({
    where: { id: serviceId }
  })
  return true
}

// ==================== SERVICE CATEGORIES ====================

export async function createCategory(salonId: string, name: string) {
  const maxOrder = await prisma.serviceCategory.aggregate({
    where: { salonId },
    _max: { sortOrder: true }
  })

  return prisma.serviceCategory.create({
    data: {
      salonId,
      name,
      sortOrder: (maxOrder._max.sortOrder ?? 0) + 1
    }
  })
}

export async function updateCategory(categoryId: string, name: string) {
  return prisma.serviceCategory.update({
    where: { id: categoryId },
    data: { name }
  })
}

export async function deleteCategory(categoryId: string) {
  // First update services to remove category reference
  await prisma.service.updateMany({
    where: { categoryId },
    data: { categoryId: null }
  })
  
  await prisma.serviceCategory.delete({
    where: { id: categoryId }
  })
  return true
}

// ==================== MASTERS ====================

export async function getMastersBySalon(salonId: string) {
  return prisma.master.findMany({
    where: { salonId },
    orderBy: { sortOrder: 'asc' }
  })
}

export async function createMaster(data: {
  salonId: string
  name: string
  role?: string
  phone?: string
  email?: string
  avatar?: string
  bio?: string
  price?: number
}) {
  return prisma.master.create({
    data: {
      ...data,
      rating: 5.0,
      reviewCount: 0,
    }
  })
}

export async function updateMaster(masterId: string, data: Partial<{
  name: string
  role: string
  phone: string
  email: string
  avatar: string
  bio: string
  price: number
  isActive: boolean
  sortOrder: number
  workingHours: any
}>) {
  return prisma.master.update({
    where: { id: masterId },
    data
  })
}

export async function deleteMaster(masterId: string) {
  await prisma.master.delete({
    where: { id: masterId }
  })
  return true
}

// ==================== CLIENTS ====================

export async function getClientsBySalon(salonId: string) {
  return prisma.client.findMany({
    where: { salonId },
    orderBy: { name: 'asc' }
  })
}

export async function createClient(data: {
  salonId: string
  name: string
  phone: string
  email?: string
  notes?: string
}) {
  return prisma.client.create({
    data
  })
}

export async function updateClient(clientId: string, data: Partial<{
  name: string
  phone: string
  email: string
  notes: string
  visitsCount: number
  totalSpent: number
  lastVisit: Date
}>) {
  return prisma.client.update({
    where: { id: clientId },
    data
  })
}

// ==================== BOOKINGS ====================

export async function createBooking(data: {
  salonId: string
  clientId?: string
  masterId?: string
  serviceId?: string
  clientName: string
  clientPhone: string
  clientEmail?: string
  serviceName?: string
  masterName?: string
  date: string
  time: string
  timeEnd?: string
  duration?: number
  price?: number
  notes?: string
}) {
  const booking = await prisma.booking.create({
    data: {
      ...data,
      duration: data.duration ?? 60,
      price: data.price ?? 0,
      status: 'CONFIRMED',
    }
  })

  // Update client stats if linked
  if (data.clientId) {
    await prisma.client.update({
      where: { id: data.clientId },
      data: {
        visitsCount: { increment: 1 },
        totalSpent: { increment: data.price ?? 0 },
        lastVisit: new Date(),
      }
    })
  }

  // Send notification (async)
  try {
    fetch('/api/telegram/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId: booking.id }),
    }).catch(console.error)
  } catch (e) {
    console.error('Failed to send notification:', e)
  }

  return booking
}

export async function getBookingsBySalon(salonId: string, date?: string) {
  return prisma.booking.findMany({
    where: {
      salonId,
      ...(date ? { date } : {})
    },
    include: {
      master: { select: { name: true } },
      service: { select: { name: true } },
    },
    orderBy: [
      { date: 'desc' },
      { time: 'asc' }
    ]
  })
}

export async function updateBookingStatus(bookingId: string, status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW') {
  return prisma.booking.update({
    where: { id: bookingId },
    data: { status }
  })
}

// ==================== SALON UPDATE ====================

export async function updateSalon(salonId: string, data: Partial<{
  name: string
  slug: string
  type: string
  description: string
  phone: string
  email: string
  address: string
  shortAddress: string
  latitude: number
  longitude: number
  photos: string[]
  workingHours: any
  amenities: string[]
  isActive: boolean
}>) {
  return prisma.salon.update({
    where: { id: salonId },
    data
  })
}

// ==================== HELPERS ====================

export function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(':').map(Number)
  const totalMinutes = hours * 60 + minutes + durationMinutes
  const endHours = Math.floor(totalMinutes / 60)
  const endMinutes = totalMinutes % 60
  return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`
}
