import { Business, Review, RequestItem } from './types';
import { auth } from './lib/firebase';

export interface AppData {
  businesses: Business[];
  reviews: Review[];
  requests: RequestItem[];
}

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error('Utente non autenticato');
  
  const token = await user.getIdToken();
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const res = await fetch(url, { ...options, headers });
  
  let data;
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await res.json();
  } else {
    const text = await res.text();
    console.error('Non-JSON response received:', text);
    throw new Error(`Risposta del server non valida (HTML). Il server potrebbe essere spento o in errore.`);
  }
  
  if (!res.ok) {
    throw new Error(data.error || 'Errore nella richiesta al server');
  }
  
  return data;
}

export async function getAppData(userId: string): Promise<AppData> {
  // userId is kept for backward compatibility in the function signature
  return fetchWithAuth('/api/data');
}

export async function saveBusiness(userId: string, b: Business): Promise<void> {
  await fetchWithAuth('/api/businesses', {
    method: 'POST',
    body: JSON.stringify(b),
  });
}

export async function createBusinessInDb(userId: string, bData: Partial<Business>): Promise<Business> {
  const data = await fetchWithAuth('/api/businesses', {
    method: 'POST',
    body: JSON.stringify(bData),
  });
  
  return {
    ...bData,
    id: data.id,
    isConnected: false,
    syncFrequency: 'daily',
    autoSyncReviews: true,
  } as Business;
}

export async function getReviewsForBusinesses(ids: string[]): Promise<Review[]> {
  const data = await fetchWithAuth('/api/data');
  return data.reviews.filter((r: any) => ids.includes(r.businessId));
}

export async function getRequestsForBusinesses(ids: string[]): Promise<RequestItem[]> {
  const data = await fetchWithAuth('/api/data');
  return data.requests.filter((r: any) => ids.includes(r.businessId));
}

export async function updateReviewInDb(reviewId: string, updates: Partial<Review>): Promise<void> {
  await fetchWithAuth(`/api/reviews/${reviewId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export async function createRequestInDb(req: RequestItem): Promise<void> {
  await fetchWithAuth('/api/requests', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

export async function resetAppData(userId: string): Promise<AppData> {
  // For simplicity, we can just return the current data or implement a specific reset endpoint
  // In Cloud SQL version, we'll let the user create their own businesses
  return getAppData(userId);
}

export async function deleteMyAccount() {
  // Not implemented in this version yet, but would call a backend route
  await auth.currentUser?.delete();
  return { success: true };
}
