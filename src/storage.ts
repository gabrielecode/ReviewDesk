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

export const skippedBusinessColumns = new Set<string>();
export const skippedReviewColumns = new Set<string>();
export const skippedRequestColumns = new Set<string>();

export function mapBusinessToDb(b: Business, userId: string, skip: Set<string> = skippedBusinessColumns) {
  const row: any = {
    id: b.id,
    user_id: userId,
    name: b.name,
    category: b.category,
    location: b.location,
    signer_name: b.signerName,
    tone: b.tone,
    default_language: b.defaultLanguage,
    is_connected: b.isConnected,
    sms_template: b.smsTemplate
  };
  if (!skip.has('phrases_to_avoid')) row.phrases_to_avoid = b.phrasesToAvoid;
  if (!skip.has('private_contact')) row.private_contact = b.privateContact;
  if (!skip.has('google_url')) row.google_url = b.googleUrl;
  if (!skip.has('google_place_id')) row.google_place_id = b.googlePlaceId || null;
  if (!skip.has('google_account_id')) row.google_account_id = b.googleAccountId || null;
  if (!skip.has('google_location_id')) row.google_location_id = b.googleLocationId || null;
  if (!skip.has('google_api_key')) row.google_api_key = b.googleApiKey || null;
  if (!skip.has('sync_frequency')) row.sync_frequency = b.syncFrequency || 'daily';
  if (!skip.has('auto_sync_reviews')) row.auto_sync_reviews = b.autoSyncReviews ?? true;
  if (!skip.has('last_sync_at')) row.last_sync_at = b.lastSyncAt || null;
  return row;
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

export function mapReviewToDb(r: Review, skip: Set<string> = skippedReviewColumns) {
  const row: any = {
    id: r.id,
    business_id: r.businessId,
    author: r.author,
    stars: r.stars,
    status: r.status
  };
  if (!skip.has('text')) row.text = r.text;
  if (!skip.has('date')) row.date = r.date;
  if (!skip.has('reply_text')) row.reply_text = r.replyText || null;
  if (!skip.has('reply_date')) row.reply_date = r.replyDate || null;
  if (!skip.has('draft_text')) row.draft_text = r.draftText || null;
  return row;
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

export function mapRequestToDb(req: RequestItem, skip: Set<string> = skippedRequestColumns) {
  const row: any = {
    id: req.id,
    business_id: req.businessId,
    client_name: req.clientName,
    status: req.status
  };
  if (!skip.has('phone')) row.phone = req.phone;
  if (!skip.has('date')) row.date = req.date;
  if (!skip.has('text')) row.text = req.text || null;
  if (!skip.has('consent')) row.consent = req.consent;
  if (!skip.has('consent_at')) row.consent_at = req.consentAt || null;
  return row;
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
      for (let attempt = 0; attempt < 5; attempt++) {
        const bizRows = data.businesses.map(b => mapBusinessToDb(b, userId, skippedBusinessColumns));
        const { error } = await supabase.from('businesses').upsert(bizRows);
        if (error) {
          const msg = error.message || '';
          const match = msg.match(/Could not find the '([^']+)' column of 'businesses'/i);
          if (match && match[1]) {
            skippedBusinessColumns.add(match[1]);
            continue;
          }
          throw error;
        }
        break;
      }
    }

    if (data.reviews.length > 0) {
      for (let attempt = 0; attempt < 5; attempt++) {
        const revRows = data.reviews.map(r => mapReviewToDb(r, skippedReviewColumns));
        const { error } = await supabase.from('reviews').upsert(revRows);
        if (error) {
          const msg = error.message || '';
          const match = msg.match(/Could not find the '([^']+)' column of 'reviews'/i);
          if (match && match[1]) {
            skippedReviewColumns.add(match[1]);
            continue;
          }
          throw error;
        }
        break;
      }
    }

    if (data.requests.length > 0) {
      for (let attempt = 0; attempt < 5; attempt++) {
        const reqRows = data.requests.map(req => mapRequestToDb(req, skippedRequestColumns));
        const { error } = await supabase.from('requests').upsert(reqRows);
        if (error) {
          const msg = error.message || '';
          const match = msg.match(/Could not find the '([^']+)' column of 'requests'/i);
          if (match && match[1]) {
            skippedRequestColumns.add(match[1]);
            continue;
          }
          throw error;
        }
        break;
      }
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
    for (let attempt = 0; attempt < 5; attempt++) {
      const row = mapRequestToDb(req, skippedRequestColumns);
      const { error } = await supabase.from('requests').insert(row);
      if (error) {
        const msg = error.message || '';
        const match = msg.match(/Could not find the '([^']+)' column of 'requests'/i);
        if (match && match[1]) {
          skippedRequestColumns.add(match[1]);
          continue;
        }
        throw error;
      }
      break;
    }
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

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const row = mapBusinessToDb(newBiz, userId, skippedBusinessColumns);
      const { error } = await supabase.from('businesses').insert(row);
      if (error) {
        const msg = error.message || '';
        const match = msg.match(/Could not find the '([^']+)' column of 'businesses'/i);
        if (match && match[1]) {
          skippedBusinessColumns.add(match[1]);
          continue;
        }
        throw error;
      }
      break;
    } catch (err: any) {
      if (attempt === 4) throw err;
      const msg = err.message || '';
      const match = msg.match(/Could not find the '([^']+)' column of 'businesses'/i);
      if (match && match[1]) {
        skippedBusinessColumns.add(match[1]);
        continue;
      }
      throw err;
    }
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
