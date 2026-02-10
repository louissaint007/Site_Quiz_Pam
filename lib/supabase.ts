
import { createClient } from '@supabase/supabase-js';

/**
 * REMPLACEZ CES VALEURS PAR VOS PROPRES CLÉS SUPABASE.
 * Allez dans votre Dashboard Supabase -> Project Settings -> API
 */
const supabaseUrl = 'https://xjeebxlmlhlejyjzygap.supabase.co'; // Remplacez par votre URL réelle
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqZWVieGxtbGhsZWp5anp5Z2FwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1Njc1NDAsImV4cCI6MjA4NTE0MzU0MH0.jEPUvqtytP3GdD-3Wwzn9kfcEht1BL-ngRfwyz8RTxU';      // Remplacez par votre clé réelle


// Fonction de validation pour éviter l'erreur "Invalid URL" au démarrage
const isValidSupabaseConfig = (url: string) => {
  try {
    const parsed = new URL(url);
    return parsed.hostname.endsWith('supabase.co') || parsed.hostname.endsWith('supabase.net');
  } catch {
    return false;
  }
};

// Si l'URL est invalide, on exporte un proxy "factice" plus robuste pour éviter de faire planter l'application
const createMockSupabase = () => {
  console.warn("ATTENTION: Supabase n'est pas correctement configuré. Utilisation d'un client factice.");
  const mockAuth = {
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
    signOut: () => Promise.resolve({ error: null }),
  };

  const mockFrom = () => ({
    select: () => ({
      order: () => ({
        maybeSingle: () => Promise.resolve({ data: null, error: null }),
        limit: () => ({ single: () => Promise.resolve({ data: null, error: null }) }),
      }),
      maybeSingle: () => Promise.resolve({ data: null, error: null }),
      eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }),
    }),
    insert: () => Promise.resolve({ error: null }),
    update: () => ({ eq: () => Promise.resolve({ error: null }) }),
    upsert: () => Promise.resolve({ error: null }),
  });

  return new Proxy({ auth: mockAuth } as any, {
    get: (target, prop) => {
      if (prop === 'auth') return mockAuth;
      if (prop === 'from') return mockFrom;
      return () => ({ ...mockFrom(), ...mockAuth });
    }
  });
};

export const supabase = isValidSupabaseConfig(supabaseUrl)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createMockSupabase();

console.log("Supabase client initialized. URL valid:", isValidSupabaseConfig(supabaseUrl));

export const isSupabaseConfigured = isValidSupabaseConfig(supabaseUrl);
