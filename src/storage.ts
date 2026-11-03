import { Business, Review, RequestItem } from './types';
import { supabase } from './lib/supabase';

export interface AppData {
  businesses: Business[];
  reviews: Review[];
  requests: RequestItem[];
}

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

export async function getAppData(userId: string): Promise<AppData> {
  try {
    const [bizRes, revRes, reqRes] = await Promise.all([
      supabase.from('businesses').select('*').eq('user_id', userId),
      supabase.from('reviews').select('*'),
      supabase.from('requests').select('*')
    ]);

    if (!bizRes.error && !revRes.error && !reqRes.error) {
      const businesses = (bizRes.data || []).map(mapBusinessFromDb);
      const bizIds = new Set(businesses.map(b => b.id));
      const reviews = (revRes.data || []).map(mapReviewFromDb).filter(r => bizIds.has(r.businessId));
      const requests = (reqRes.data || []).map(mapRequestFromDb).filter(req => bizIds.has(req.businessId));

      return { businesses, reviews, requests };
    }
  } catch (err) {
    console.error('Supabase DB fetch error:', err);
  }

  return { businesses: [], reviews: [], requests: [] };
}

export async function saveAppData(userId: string, data: AppData): Promise<void> {
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
    console.error('Supabase DB save error:', err);
    throw err;
  }
}

export async function updateReviewInDb(reviewId: string, updates: Partial<Review>): Promise<void> {
  try {
    const dbUpdates: any = {};
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.draftText !== undefined) dbUpdates.draft_text = updates.draftText;
    if (updates.replyText !== undefined) dbUpdates.reply_text = updates.replyText;
    if (updates.replyDate !== undefined) dbUpdates.reply_date = updates.replyDate;

    const { error } = await supabase.from('reviews').update(dbUpdates).eq('id', reviewId);
    if (error) throw error;
  } catch (err) {
    console.error('Supabase update review error:', err);
    throw err;
  }
}

export async function createRequestInDb(req: RequestItem): Promise<void> {
  try {
    const row = mapRequestToDb(req);
    const { error } = await supabase.from('requests').insert(row);
    if (error) throw error;
  } catch (err) {
    console.error('Supabase create request error:', err);
    throw err;
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
    const { error } = await supabase.from('businesses').insert(row);
    if (error) throw error;
  } catch (err) {
    console.error('Supabase create business error:', err);
    throw err;
  }

  return newBiz;
}

export async function clearDemoData(userId: string): Promise<AppData> {
  return getAppData(userId);
}

export async function resetAppData(userId: string): Promise<AppData> {
  return getAppData(userId);
}

export async function loadDemoDataToDb(userId: string): Promise<AppData> {
  return getAppData(userId);
}

export async function deleteMyAccount() {
  try {
    const { error } = await supabase.rpc('delete_my_account');
    if (error) throw error;
  } catch (err) {
    console.error('Error deleting account via RPC:', err);
  }
  await supabase.auth.signOut();
  return { success: true };
}
