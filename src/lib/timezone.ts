/**
 * Утиліта для визначення таймзони по адресу
 * 
 * 1. Адреса → координати (Nominatim / OpenStreetMap)
 * 2. Координати → таймзона (timeapi.io - безкоштовний)
 */

interface GeocodingResult {
  lat: number;
  lng: number;
}

interface TimezoneResult {
  timezone: string;
  lat?: number;
  lng?: number;
}

/**
 * Отримати координати по адресу через Nominatim (OpenStreetMap)
 * Безкоштовний, без API ключа, але з лімітом 1 запит/сек
 */
async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
  try {
    const encoded = encodeURIComponent(address);
    const url = `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1`;
    
    const res = await fetch(url, {
      headers: {
        // Nominatim вимагає User-Agent
        'User-Agent': 'BookingPlatform/1.0'
      }
    });

    if (!res.ok) {
      console.error('Geocoding failed:', res.status);
      return null;
    }

    const data = await res.json();
    
    if (!data || data.length === 0) {
      console.warn('No geocoding results for:', address);
      return null;
    }

    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon)
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

/**
 * Отримати таймзону по координатах через timeapi.io
 * Безкоштовний, без реєстрації
 */
async function getTimezoneByCoords(lat: number, lng: number): Promise<string | null> {
  try {
    const url = `https://timeapi.io/api/timezone/coordinate?latitude=${lat}&longitude=${lng}`;
    
    const res = await fetch(url);

    if (!res.ok) {
      console.error('Timezone API failed:', res.status);
      return null;
    }

    const data = await res.json();
    
    // timeapi.io повертає { timeZone: "Europe/Kiev", ... }
    return data.timeZone || null;
  } catch (error) {
    console.error('Timezone lookup error:', error);
    return null;
  }
}

/**
 * Головна функція: адреса → таймзона
 * Повертає також координати для збереження в БД
 */
export async function getTimezoneFromAddress(address: string): Promise<TimezoneResult | null> {
  // 1. Геокодинг
  const coords = await geocodeAddress(address);
  
  if (!coords) {
    console.warn('Could not geocode address:', address);
    return null;
  }

  // 2. Таймзона по координатах
  const timezone = await getTimezoneByCoords(coords.lat, coords.lng);
  
  if (!timezone) {
    console.warn('Could not determine timezone for coords:', coords);
    return null;
  }

  return {
    timezone,
    lat: coords.lat,
    lng: coords.lng
  };
}

/**
 * Оновити таймзону салону і всіх його мастерів
 */
export async function updateSalonTimezone(
  prisma: any,
  salonId: string,
  timezone: string,
  lat?: number,
  lng?: number
): Promise<void> {
  // Оновлюємо салон
  await prisma.salon.update({
    where: { id: salonId },
    data: {
      timezone,
      ...(lat !== undefined && { latitude: lat }),
      ...(lng !== undefined && { longitude: lng })
    }
  });

  // Оновлюємо всіх мастерів цього салону
  await prisma.master.updateMany({
    where: { salonId },
    data: { timezone }
  });
}
