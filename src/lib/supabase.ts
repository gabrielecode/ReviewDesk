import { createClient } from '@supabase/supabase-js';

export function cleanSupabaseUrl(url: string | undefined | null): string {
  if (!url) return '';
  let cleaned = String(url).trim();
  // Strip trailing slashes
  cleaned = cleaned.replace(/\/+$/, '');
  // Strip /rest/v1 or /rest or /auth if accidentally appended in Vercel env var
  cleaned = cleaned.replace(/\/(rest|auth)(\/v1)?$/i, '');
  // Strip trailing slashes again
  cleaned = cleaned.replace(/\/+$/, '');
  return cleaned;
}

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseUrl = cleanSupabaseUrl(rawUrl);
export const supabaseAnonKey = rawKey ? String(rawKey).trim() : '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== '' &&
  supabaseAnonKey !== '' &&
  !supabaseUrl.includes('placeholder')
);

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);
