import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Clean URL: strip trailing slashes and trim whitespace to prevent 'Invalid path specified in request URL' errors
export const supabaseUrl = rawUrl ? String(rawUrl).trim().replace(/\/+$/, '') : '';
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
