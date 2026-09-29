import { createClient } from '@supabase/supabase-js';

const STORAGE_KEY = 'supabase_config_v1';

// ── FALLBACK HARDCODED CREDENTIALS ────────────────────────────────────────────
// Supabase anon key is a PUBLIC key by design (secured via RLS policies).
// Hardcoding it here ensures every browser (Chrome, Brave, incognito, Netlify)
// always connects to Supabase for realtime sync — no manual config needed.
// Priority: manual admin config (localStorage) > env vars > hardcoded fallback
const HARDCODED_SUPABASE_URL = 'https://xgawnlzippscyknydqmt.supabase.co';
const HARDCODED_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnYXdubHppcHBzY3lrbnlkcW10Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxNDI3NjgsImV4cCI6MjEwNTcxODc2OH0.-rZ8yq4ISMlgmCmrHE2zkyb3Sw5ZxnVO8wUfmVcsEck';
// ─────────────────────────────────────────────────────────────────────────────

// Smart cleaner for Supabase URL (extracts https://[id].supabase.co even if full rest URL or .env block is pasted)
export function cleanSupabaseUrl(raw) {
  if (!raw) return '';
  const str = String(raw).trim();
  const urlMatch = str.match(/https?:\/\/[a-zA-Z0-9_\-\.]+\.supabase\.co/i);
  if (urlMatch) {
    return urlMatch[0];
  }
  return str.replace(/\/rest\/v1\/?.*$/i, '').replace(/\/+$/, '');
}

// Smart cleaner for Supabase API Key (extracts clean key even if full .env line or block is pasted)
export function cleanSupabaseKey(raw) {
  if (!raw) return '';
  const str = String(raw).trim();

  // 1. Check if user pasted lines like NEXT_PUBLIC_SUPABASE_ANON_KEY=... or PUBLISHABLE_KEY=...
  const keyLineMatch = str.match(/(?:ANON_KEY|PUBLISHABLE_KEY|API_KEY)\s*=\s*([^\s\r\n]+)/i);
  if (keyLineMatch) {
    return keyLineMatch[1].trim().replace(/^["']|["']$/g, '');
  }

  // 2. Check for standard JWT key format: eyJ...
  const jwtMatch = str.match(/(eyJ[a-zA-Z0-9_\-\.]+)/);
  if (jwtMatch) {
    return jwtMatch[1];
  }

  // 3. Check for new Supabase publishable key format: sb_publishable_...
  const sbMatch = str.match(/(sb_publishable_[a-zA-Z0-9_\-\.]+)/);
  if (sbMatch) {
    return sbMatch[1];
  }

  // 4. Fallback: take last line, remove quotes and any variable prefix
  const lines = str.split(/[\r\n]+/).map(l => l.trim()).filter(Boolean);
  if (lines.length > 0) {
    let target = lines[lines.length - 1];
    if (target.includes('=')) {
      target = target.split('=').slice(1).join('=').trim();
    }
    return target.replace(/^["']|["']$/g, '');
  }

  return str;
}

// Helper to get active configuration from environment or localStorage
export function getSupabaseConfig() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      const url = cleanSupabaseUrl(parsed.url);
      const anonKey = cleanSupabaseKey(parsed.anonKey);
      if (url && anonKey) {
        return {
          url,
          anonKey,
          source: 'manual',
        };
      }
    }
  } catch (e) {
    console.warn('Error reading saved Supabase config:', e);
  }

  const envUrl = cleanSupabaseUrl(import.meta.env.VITE_SUPABASE_URL);
  const envKey = cleanSupabaseKey(import.meta.env.VITE_SUPABASE_ANON_KEY);

  if (envUrl && envKey) {
    return {
      url: envUrl,
      anonKey: envKey,
      source: 'env',
    };
  }

  // Fallback to hardcoded credentials (public anon key — safe to embed)
  if (HARDCODED_SUPABASE_URL && HARDCODED_SUPABASE_ANON_KEY) {
    return {
      url: HARDCODED_SUPABASE_URL,
      anonKey: HARDCODED_SUPABASE_ANON_KEY,
      source: 'hardcoded',
    };
  }

  return {
    url: '',
    anonKey: '',
    source: 'none',
  };
}

let supabaseInstance = null;
let currentConfigKey = '';

// Get or initialize Supabase client
export function getSupabaseClient() {
  const config = getSupabaseConfig();
  if (!config.url || !config.anonKey) {
    supabaseInstance = null;
    currentConfigKey = '';
    return null;
  }

  const newKey = `${config.url}_${config.anonKey}`;
  if (supabaseInstance && currentConfigKey === newKey) {
    return supabaseInstance;
  }

  try {
    supabaseInstance = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
    currentConfigKey = newKey;
    return supabaseInstance;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
}

// Check if configured
export function isSupabaseConfigured() {
  const config = getSupabaseConfig();
  return Boolean(config.url && config.anonKey);
}

// Save custom configuration from Admin UI
export function saveSupabaseConfig(rawUrl, rawKey) {
  const url = cleanSupabaseUrl(rawUrl);
  const anonKey = cleanSupabaseKey(rawKey);

  if (!url || !anonKey) {
    localStorage.removeItem(STORAGE_KEY);
    supabaseInstance = null;
    currentConfigKey = '';
    return false;
  }

  const config = { url, anonKey };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  supabaseInstance = null;
  currentConfigKey = '';
  return true;
}

// Remove custom config
export function clearSupabaseConfig() {
  localStorage.removeItem(STORAGE_KEY);
  supabaseInstance = null;
  currentConfigKey = '';
}

// Test connection
export async function testSupabaseConnection(rawUrl = null, rawKey = null) {
  let client = null;
  if (rawUrl && rawKey) {
    const cleanUrl = cleanSupabaseUrl(rawUrl);
    const cleanKey = cleanSupabaseKey(rawKey);
    if (!cleanUrl || !cleanKey) {
      return { success: false, message: 'URL atau API Key tidak valid. Pastikan format URL dan Key benar.' };
    }
    try {
      client = createClient(cleanUrl, cleanKey);
    } catch (e) {
      return { success: false, message: `Format URL/Key salah: ${e.message}` };
    }
  } else {
    client = getSupabaseClient();
  }

  if (!client) {
    return { success: false, message: 'URL atau Anon Key Supabase belum diisi.' };
  }

  try {
    const { data, error } = await client.from('bookings').select('id').limit(1);
    if (error) {
      if (error.code === '42P01') {
        return {
          success: false,
          message: 'Koneksi berhasil, namun tabel "bookings" belum dibuat! Silakan jalankan script SQL di menu SQL Editor Supabase Anda.',
        };
      }
      return { success: false, message: `Error Supabase: ${error.message}` };
    }
    return { success: true, message: 'Koneksi ke Supabase Cloud Berhasil 100%!' };
  } catch (err) {
    return { success: false, message: `Gagal terhubung: ${err.message}` };
  }
}
