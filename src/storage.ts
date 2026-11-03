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
    is_connected: b.isConnected,
    sms_template: b.smsTemplate,
    phrases_to_avoid: b.phrasesToAvoid,
    private_contact: b.privateContact,
    google_url: b.googleUrl,
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
    status: row.status === 'risposto' ? 'pubblicata' : (row.status || 'da_rispondere'),
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
    status: r.status,
    text: r.text,
    date: r.date,
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
    status: req.status,
    phone: req.phone,
    date: req.date,
    text: req.text || null,
    consent: req.consent,
    consent_at: req.consentAt || null
  };
}

export async function getAppData(userId: string): Promise<AppData> {
  const bizRes = await supabase.from('businesses').select('*').eq('user_id', userId);
  if (bizRes.error) throw new Error(`Fetch businesses error: ${bizRes.error.message}`);
  
  const businesses = (bizRes.data || []).map(mapBusinessFromDb);
  let reviews: Review[] = [];
  let requests: RequestItem[] = [];

  if (businesses.length > 0) {
    const bizIds = businesses.map(b => b.id);
    reviews = await getReviewsForBusinesses(bizIds);
    requests = await getRequestsForBusinesses(bizIds);
  }

  return { businesses, reviews, requests };
}

export async function getReviewsForBusinesses(ids: string[]): Promise<Review[]> {
  const { data, error } = await supabase.from('reviews').select('*').in('business_id', ids);
  if (error) throw new Error(`Fetch reviews error: ${error.message}`);
  return (data || []).map(mapReviewFromDb);
}

export async function getRequestsForBusinesses(ids: string[]): Promise<RequestItem[]> {
  const { data, error } = await supabase.from('requests').select('*').in('business_id', ids);
  if (error) throw new Error(`Fetch requests error: ${error.message}`);
  return (data || []).map(mapRequestFromDb);
}

export async function saveBusiness(userId: string, b: Business): Promise<void> {
  const row = mapBusinessToDb(b, userId);
  const { error } = await supabase.from('businesses').upsert(row);
  if (error) throw new Error(`Save business error: ${error.message}`);
}

export async function updateReviewInDb(reviewId: string, updates: Partial<Review>): Promise<void> {
  const dbUpdates: any = {};
  if (updates.hasOwnProperty('status')) dbUpdates.status = updates.status;
  if (updates.hasOwnProperty('draftText')) dbUpdates.draft_text = updates.draftText === undefined ? null : updates.draftText;
  if (updates.hasOwnProperty('replyText')) dbUpdates.reply_text = updates.replyText === undefined ? null : updates.replyText;
  if (updates.hasOwnProperty('replyDate')) dbUpdates.reply_date = updates.replyDate === undefined ? null : updates.replyDate;

  const { error } = await supabase.from('reviews').update(dbUpdates).eq('id', reviewId);
  if (error) throw new Error(`Update review error: ${error.message}`);
}

export async function createRequestInDb(req: RequestItem): Promise<void> {
  const row = mapRequestToDb(req);
  const { error } = await supabase.from('requests').insert(row);
  if (error) throw new Error(`Create request error: ${error.message}`);
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
    googleUrl: bData.googleUrl || '',
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

  const row = mapBusinessToDb(newBiz, userId);
  const { error } = await supabase.from('businesses').insert(row);
  if (error) throw new Error(`Create business error: ${error.message}`);

  return newBiz;
}

export const DEMO_BUSINESSES: Business[] = [
  {
    id: 'demo-biz-1',
    name: 'Osteria Centrale',
    category: 'Ristorazione',
    location: 'Lugano',
    signerName: 'Chef Marco',
    tone: 'caloroso',
    defaultLanguage: 'it',
    phrasesToAvoid: 'costoso, lento',
    privateContact: 'direzione@osteriacentrale.ch',
    googleUrl: '',
    isConnected: false,
    smsTemplate: 'Ciao {nome}, grazie per averci scelto! Lasciaci una recensione qui: {link}',
    googlePlaceId: '',
    googleAccountId: '',
    googleLocationId: '',
    googleApiKey: '',
    syncFrequency: 'daily',
    autoSyncReviews: true,
    lastSyncAt: ''
  }
];

export const DEMO_REVIEWS: Review[] = [
  {
    id: 'demo-rev-1',
    businessId: 'demo-biz-1',
    author: 'Elena Bianchi',
    stars: 5,
    text: 'Cibo eccellente e servizio impeccabile. Lo consiglio a tutti!',
    date: new Date().toISOString().split('T')[0],
    status: 'da_rispondere'
  },
  {
    id: 'demo-rev-2',
    businessId: 'demo-biz-1',
    author: 'Luca Rossi',
    stars: 4,
    text: 'Ambiente molto accogliente, peccato per il parcheggio difficile.',
    date: new Date().toISOString().split('T')[0],
    status: 'pubblicata',
    replyText: 'Grazie Luca! Siamo felici che ti sia piaciuto l\'ambiente. Purtroppo il parcheggio in centro è una sfida, ma speriamo di rivederti presto!',
    replyDate: new Date().toISOString().split('T')[0]
  }
];

export async function resetAppData(userId: string): Promise<AppData> {
  const prefix = 'demo-' + userId.substring(0, 8) + '-';
  const bizRows = DEMO_BUSINESSES.map(b => mapBusinessToDb({ ...b, id: prefix + b.id }, userId));
  const { error: bizError } = await supabase.from('businesses').upsert(bizRows);
  if (bizError) throw new Error(`Reset businesses error: ${bizError.message}`);
  
  const revRows = DEMO_REVIEWS.map(r => mapReviewToDb({ 
    ...r, 
    id: bizRows[0].id + '-' + r.id,
    businessId: bizRows[0].id 
  }));
  const { error: revError } = await supabase.from('reviews').upsert(revRows);
  if (revError) throw new Error(`Reset reviews error: ${revError.message}`);
  
  return getAppData(userId);
}

export async function deleteMyAccount() {
  const { error } = await supabase.rpc('delete_my_account');
  if (error) throw new Error(`Delete account error: ${error.message}`);
  await supabase.auth.signOut();
  return { success: true };
}
