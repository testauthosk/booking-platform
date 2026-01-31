// Client-side API functions (use fetch, no Prisma)
// Server-side functions are in api-server.ts

// ==================== CLIENT API FUNCTIONS ====================

export interface SalonWithRelations {
  id: string;
  name: string;
  slug: string;
  type: string;
  description: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  short_address: string | null;
  coordinates_lat: number | null;
  coordinates_lng: number | null;
  photos: string[];
  working_hours: any;
  amenities: string[];
  rating: number;
  review_count: number;
  services: Array<{
    id: string;
    name: string;
    sort_order: number;
    items: Array<{
      id: string;
      name: string;
      description: string | null;
      price: number;
      price_from: boolean;
      duration: string;
      duration_minutes: number;
      is_active: boolean;
    }>;
  }>;
  masters: Array<{
    id: string;
    name: string;
    role: string | null;
    avatar: string | null;
    rating: number;
    review_count: number;
    price: number;
  }>;
  reviews: Array<{
    id: string;
    author_name: string;
    author_initial: string;
    author_color: string;
    rating: number;
    text: string | null;
    service_name: string | null;
    created_at: string;
  }>;
}

export async function getSalonBySlug(slug: string): Promise<SalonWithRelations | null> {
  try {
    const response = await fetch(`/api/salon/${slug}`);
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

export async function createBooking(data: {
  salonId: string;
  clientId?: string;
  masterId?: string;
  serviceId?: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  serviceName?: string;
  masterName?: string;
  date: string;
  time: string;
  timeEnd?: string;
  duration?: number;
  price?: number;
  notes?: string;
}) {
  try {
    const response = await fetch('/api/booking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

// ==================== HELPERS ====================

export function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60);
  const endMinutes = totalMinutes % 60;
  return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
}
