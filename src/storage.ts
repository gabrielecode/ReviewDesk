import { Business, Review, RequestItem } from './types';
import { supabase } from './lib/supabase';

export interface AppData {
  businesses: Business[];
  reviews: Review[];
  requests: RequestItem[];
}

export const initialDemoBusinesses: Business[] = [
  {
    id: 'biz-connect-create-1',
    name: 'Connect and create',
    category: 'Consulenza e Siti Web',
    location: 'Morbiolo Inferiore / Lugano',
    signerName: 'Gabriele',
    tone: 'caloroso',
    defaultLanguage: 'it',
    phrasesToAvoid: '',
    privateContact: 'info@sititicino.ch',
    googleUrl: 'https://g.page/r/connect-and-create/review',
    isConnected: true,
    smsTemplate: 'Buongiorno {nome}, grazie per la collaborazione con Connect and create! Lasciaci una recensione su Google: {link}',
    googlePlaceId: 'ChIJ_x5z8R3a1EcR95-xX8aL1mY',
    googleAccountId: 'accounts/104928374920182736451',
    googleLocationId: 'locations/98765432109876543210',
    googleApiKey: '',
    syncFrequency: 'daily',
    autoSyncReviews: true,
    lastSyncAt: new Date().toISOString()
  }
];

export function generateDemoReviewsForBusiness(businessId: string): Review[] {
  return [
    {
      id: businessId + '-real-1',
      businessId,
      author: 'luigi riente',
      stars: 5,
      text: 'Professionalità, competenza e prezzi reali. Lo sviluppatore mi ha risposto subito su WhatsApp, mi ha spiegato tutto con chiarezza.',
      date: '2026-10-13',
      status: 'da_rispondere'
    },
    {
      id: businessId + '-real-2',
      businessId,
      author: 'Sara Casanova',
      stars: 5,
      text: 'Ottima consulenza e supporto eccellente per Connect and Create. Servizio puntuale e grande disponibilità in Ticino. Consigliatissimo!',
      date: '2026-09-19',
      status: 'pubblicata',
      replyText: 'Grazie mille Sara per le bellissime parole! È stato un piacere collaborare con voi. Un caro saluto, Gabriele.',
      replyDate: '2026-09-20'
    }
  ];
}

export function generateDemoRequestsForBusiness(businessId: string): RequestItem[] {
  const nowIso = new Date().toISOString();
  return [
    {
      id: businessId + '-req-1',
      businessId,
      clientName: 'luigi riente',
      phone: '+41791234567',
      date: '2026-10-13 14:30',
      status: 'recensione_ricevuta',
      text: 'Ciao Luigi! Grazie per la collaborazione.',
      consent: true,
      consentAt: nowIso
    },
    {
      id: businessId + '-req-2',
      businessId,
      clientName: 'Sara Casanova',
      phone: '+41789876543',
      date: '2026-09-18 19:15',
      status: 'recensione_ricevuta',
      text: 'Buongiorno Sara, grazie per la visita!',
      consent: true,
      consentAt: nowIso
    }
  ];
}

// Mappers
export function mapBusinessFromDb(row: any): Business {
  return {
    id: row.id,
    name: row.name || '',
    category: row.category || '',
    location: row.location || '',
    signerName: row.signer_name || row.signerName || '',
    tone: row.tone || 'caloroso',
    defaultLanguage: row.default_language || row.defaultLanguage || 'it',
    phrasesToAvoid: row.phrases_to_avoid || row.phrasesToAvoid || '',
    privateContact: row.private_contact || row.privateContact || '',
    googleUrl: row.google_url || row.googleUrl || '',
    isConnected: row.is_connected ?? row.isConnected ?? false,
    smsTemplate: row.sms_template || row.smsTemplate || '',
    googlePlaceId: row.google_place_id || row.googlePlaceId || '',
    googleAccountId: row.google_account_id || row.googleAccountId || '',
    googleLocationId: row.google_location_id || row.googleLocationId || '',
    googleApiKey: row.google_api_key || row.googleApiKey || '',
    syncFrequency: row.sync_frequency || row.syncFrequency || 'daily',
    autoSyncReviews: row.auto_sync_reviews ?? row.autoSyncReviews ?? true,
    lastSyncAt: row.last_sync_at || row.lastSyncAt || ''
  };
}

export function mapBusinessToDb(b: Business, userId: string) {
  return {
    id: b.id,
    user_id: userId,
    name: b.name,
    category: b.category,
    location: b.location,
    signer_name: b.signerName,
    tone: b.tone,
    default_language: b.defaultLanguage,
    phrases_to_avoid: b.phrasesToAvoid,
    private_contact: b.privateContact,
    google_url: b.googleUrl,
    is_connected: b.isConnected,
    sms_template: b.smsTemplate,
    google_place_id: b.googlePlaceId || null,
    google_account_id: b.googleAccountId || null,
    google_location_id: b.googleLocationId || null,
    google_api_key: b.googleApiKey || null,
    sync_frequency: b.syncFrequency || 'daily',
    auto_sync_reviews: b.autoSyncReviews ?? true,
    last_sync_at: b.lastSyncAt || null
  };
}

export function mapReviewFromDb(row: any): Review {
  return {
    id: row.id,
    businessId: row.business_id || row.businessId,
    author: row.author || '',
    stars: row.stars || 5,
    text: row.text || '',
    date: row.date || row.review_date || new Date().toISOString().split('T')[0],
    status: row.status || 'da_rispondere',
    replyText: row.reply_text || row.replyText,
    replyDate: row.reply_date || row.replyDate,
    draftText: row.draft_text || row.draftText
  };
}

export function mapReviewToDb(r: Review) {
  return {
    id: r.id,
    business_id: r.businessId,
    author: r.author,
    stars: r.stars,
    text: r.text,
    date: r.date,
    status: r.status,
    reply_text: r.replyText || null,
    reply_date: r.replyDate || null,
    draft_text: r.draftText || null
  };
}

export function mapRequestFromDb(row: any): RequestItem {
  return {
    id: row.id,
    businessId: row.business_id || row.businessId,
    clientName: row.client_name || row.clientName || '',
    phone: row.phone || '',
    date: row.date || '',
    status: row.status || 'inviata',
    text: row.text || '',
    consent: !!row.consent,
    consentAt: row.consent_at || row.consentAt
  };
}

export function mapRequestToDb(req: RequestItem) {
  return {
    id: req.id,
    business_id: req.businessId,
    client_name: req.clientName,
    phone: req.phone,
    date: req.date,
    status: req.status,
    text: req.text || null,
    consent: req.consent,
    consent_at: req.consentAt || null
  };
}

// Storage API functions using Supabase
// Storage API functions using Supabase with LocalStorage fallback
export async function getAppData(userId: string): Promise<AppData> {
  const cacheKey = `reviewdesk_data_${userId}`;

  try {
    const [bizRes, revRes, reqRes] = await Promise.all([
      supabase.from('businesses').select('*'),
      supabase.from('reviews').select('*'),
      supabase.from('requests').select('*')
    ]);

    if (!bizRes.error && !revRes.error && !reqRes.error) {
      const businesses = (bizRes.data || []).map(mapBusinessFromDb);
      const reviews = (revRes.data || []).map(mapReviewFromDb);
      const requests = (reqRes.data || []).map(mapRequestFromDb);

      if (businesses.length > 0) {
        // Merge with LocalStorage to preserve any imported reviews
        const cachedStr = localStorage.getItem(cacheKey);
        let mergedReviews = reviews;
        if (cachedStr) {
          try {
            const cached = JSON.parse(cachedStr);
            if (Array.isArray(cached.reviews) && cached.reviews.length > 0) {
              const dbRevMap = new Map(reviews.map(r => [r.id, r]));
              for (const cr of cached.reviews) {
                if (!dbRevMap.has(cr.id)) {
                  dbRevMap.set(cr.id, cr);
                }
              }
              mergedReviews = Array.from(dbRevMap.values());
            }
          } catch {}
        }

        const fullData = { businesses, reviews: mergedReviews, requests };
        localStorage.setItem(cacheKey, JSON.stringify(fullData));
        return fullData;
      }
    }
  } catch (err) {
    console.warn('Supabase DB fetch error, falling back to local cache:', err);
  }

  // Check LocalStorage cache
  const cachedStr = localStorage.getItem(cacheKey);
  if (cachedStr) {
    try {
      const cached = JSON.parse(cachedStr);
      if (cached && Array.isArray(cached.businesses) && cached.businesses.length > 0) {
        return cached;
      }
    } catch {}
  }

  // If no data found at all, return default demo data or admin business
  const isAdmin = userId.includes('sititicino') || userId.includes('admin');
  const demoBizList = initialDemoBusinesses.map((b, idx) => {
    if (idx === 0 && isAdmin) {
      return {
        ...b,
        name: 'Connect and create',
        category: 'Consulenza e Siti Web',
        location: 'Morbiolo Inferiore / Lugano',
        signerName: 'Gabriele Sestito',
        privateContact: 'info@sititicino.ch'
      };
    }
    return b;
  });

  const demoBiz = demoBizList[0];
  const demoRev = generateDemoReviewsForBusiness(demoBiz.id);
  const demoReq = generateDemoRequestsForBusiness(demoBiz.id);

  const fallbackData: AppData = {
    businesses: [demoBiz],
    reviews: demoRev,
    requests: demoReq
  };

  localStorage.setItem(cacheKey, JSON.stringify(fallbackData));
  return fallbackData;
}

export async function saveAppData(userId: string, data: AppData): Promise<void> {
  const cacheKey = `reviewdesk_data_${userId}`;
  localStorage.setItem(cacheKey, JSON.stringify(data));

  try {
    if (data.businesses.length > 0) {
      const bizRows = data.businesses.map(b => mapBusinessToDb(b, userId));
      await supabase.from('businesses').upsert(bizRows);
    }

    if (data.reviews.length > 0) {
      const revRows = data.reviews.map(mapReviewToDb);
      await supabase.from('reviews').upsert(revRows);
    }

    if (data.requests.length > 0) {
      const reqRows = data.requests.map(mapRequestToDb);
      await supabase.from('requests').upsert(reqRows);
    }
  } catch (err) {
    console.warn('Supabase DB save error:', err);
  }
}

export async function updateReviewInDb(reviewId: string, updates: Partial<Review>): Promise<void> {
  try {
    const dbUpdates: any = {};
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.draftText !== undefined) dbUpdates.draft_text = updates.draftText;
    if (updates.replyText !== undefined) dbUpdates.reply_text = updates.replyText;
    if (updates.replyDate !== undefined) dbUpdates.reply_date = updates.replyDate;

    await supabase.from('reviews').update(dbUpdates).eq('id', reviewId);
  } catch (err) {
    console.warn('Supabase update review error:', err);
  }
}

export async function createRequestInDb(req: RequestItem): Promise<void> {
  try {
    const row = mapRequestToDb(req);
    await supabase.from('requests').insert(row);
  } catch (err) {
    console.warn('Supabase create request error:', err);
  }
}

export async function createBusinessInDb(userId: string, bData: Partial<Business>): Promise<Business> {
  const newId = 'biz-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
  const newBiz: Business = {
    id: newId,
    name: bData.name || 'Nuova Attività',
    category: bData.category || 'Servizi',
    location: bData.location || 'Città',
    signerName: bData.signerName || 'Staff',
    tone: (bData.tone as any) || 'caloroso',
    defaultLanguage: (bData.defaultLanguage as any) || 'it',
    phrasesToAvoid: bData.phrasesToAvoid || '',
    privateContact: bData.privateContact || '',
    googleUrl: bData.googleUrl || 'https://g.page/review',
    isConnected: false,
    smsTemplate: bData.smsTemplate || 'Buongiorno {nome}, grazie per averci scelto! Lasciaci una recensione qui: {link}',
    googlePlaceId: bData.googlePlaceId || '',
    googleAccountId: bData.googleAccountId || '',
    googleLocationId: bData.googleLocationId || '',
    googleApiKey: bData.googleApiKey || '',
    syncFrequency: bData.syncFrequency || 'daily',
    autoSyncReviews: bData.autoSyncReviews ?? true,
    lastSyncAt: ''
  };

  try {
    const row = mapBusinessToDb(newBiz, userId);
    await supabase.from('businesses').insert(row);
  } catch (err) {
    console.warn('Supabase create business error:', err);
  }

  // Update local cache
  const cacheKey = `reviewdesk_data_${userId}`;
  const cachedStr = localStorage.getItem(cacheKey);
  if (cachedStr) {
    try {
      const cached = JSON.parse(cachedStr);
      cached.businesses = cached.businesses || [];
      cached.businesses.push(newBiz);
      localStorage.setItem(cacheKey, JSON.stringify(cached));
    } catch {}
  }

  return newBiz;
}

export async function loadDemoDataToDb(userId: string): Promise<AppData> {
  const cacheKey = `reviewdesk_data_${userId}`;
  const isAdmin = userId.includes('sititicino') || userId.includes('admin');

  const demoBiz = {
    ...initialDemoBusinesses[0],
    name: isAdmin ? 'Connect and create' : initialDemoBusinesses[0].name
  };
  const demoRev = generateDemoReviewsForBusiness(demoBiz.id);
  const demoReq = generateDemoRequestsForBusiness(demoBiz.id);

  const fullData = { businesses: [demoBiz], reviews: demoRev, requests: demoReq };
  localStorage.setItem(cacheKey, JSON.stringify(fullData));

  try {
    const bizRow = mapBusinessToDb(demoBiz, userId);
    const revRows = demoRev.map(mapReviewToDb);
    const reqRows = demoReq.map(mapRequestToDb);

    await supabase.from('businesses').insert(bizRow);
    if (revRows.length > 0) await supabase.from('reviews').insert(revRows);
    if (reqRows.length > 0) await supabase.from('requests').insert(reqRows);
  } catch (err) {
    console.warn('Supabase load demo data error:', err);
  }

  return fullData;
}

export async function clearDemoData(userId: string): Promise<AppData> {
  const cacheKey = `reviewdesk_data_${userId}`;

  try {
    const demoBizIds = initialDemoBusinesses.map(b => b.id);
    await supabase.from('reviews').delete().in('business_id', demoBizIds);
    await supabase.from('requests').delete().in('business_id', demoBizIds);
    await supabase.from('businesses').delete().in('id', demoBizIds);

    // Remove any review/request with demo ID patterns
    await supabase.from('reviews').delete().like('id', '%-rev-%');
    await supabase.from('requests').delete().like('id', '%-req-%');
  } catch (err) {
    console.warn('Supabase clear demo error:', err);
  }

  const cachedStr = localStorage.getItem(cacheKey);
  let current: AppData = { businesses: [], reviews: [], requests: [] };
  if (cachedStr) {
    try {
      current = JSON.parse(cachedStr);
    } catch {}
  }

  const demoIdsSet = new Set(initialDemoBusinesses.map(b => b.id));
  current.businesses = (current.businesses || []).filter(
    b => !demoIdsSet.has(b.id) && !b.id.startsWith('osteria-demo') && !b.id.startsWith('salone-demo') && !b.id.startsWith('studio-demo')
  );
  current.reviews = (current.reviews || []).filter(r => !r.id.includes('-rev-'));
  current.requests = (current.requests || []).filter(req => !req.id.includes('-req-'));

  localStorage.setItem(cacheKey, JSON.stringify(current));
  return current;
}

export async function resetAppData(userId: string): Promise<AppData> {
  const cacheKey = `reviewdesk_data_${userId}`;
  localStorage.removeItem(cacheKey);

  try {
    const { data: userBiz } = await supabase.from('businesses').select('id');
    if (userBiz && userBiz.length > 0) {
      const bizIds = userBiz.map(b => b.id);
      await supabase.from('reviews').delete().in('business_id', bizIds);
      await supabase.from('requests').delete().in('business_id', bizIds);
      await supabase.from('businesses').delete().in('id', bizIds);
    }
  } catch (err) {
    console.warn('Supabase reset data error:', err);
  }

  return loadDemoDataToDb(userId);
}

export async function deleteMyAccount() {
  try {
    await supabase.rpc('delete_my_account');
  } catch {}
  await supabase.auth.signOut();
  localStorage.clear();
  return { success: true };
}

