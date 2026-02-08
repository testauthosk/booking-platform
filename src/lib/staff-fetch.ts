/**
 * Fetch wrapper для staff API — автоматично додає Authorization header.
 * При 401 — автоматичний logout і редірект на логін.
 */
export async function staffFetch(url: string, options?: RequestInit): Promise<Response> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('staffToken') : null;

  const headers = new Headers(options?.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Не встановлюємо Content-Type для FormData (browser сам поставить multipart boundary)
  if (!headers.has('Content-Type') && options?.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, { ...options, headers });

  // Auto-logout on 401 (token expired/invalid)
  if (response.status === 401 && typeof window !== 'undefined') {
    localStorage.removeItem('staffToken');
    localStorage.removeItem('staffId');
    localStorage.removeItem('staffName');
    localStorage.removeItem('staffSalonId');
    localStorage.removeItem('staffAvatar');
    window.location.href = '/staff/login?expired=1';
  }

  return response;
}
