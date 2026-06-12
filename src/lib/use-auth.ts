'use client';
import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export type OAuthProvider = 'google' | 'apple';

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { user, loading };
}

export function signInWithProvider(provider: OAuthProvider) {
  return supabase.auth.signInWithOAuth({
    provider,
    // Back to the app after the OAuth round-trip; the supabase client picks
    // the session out of the URL on load (detectSessionInUrl is the default).
    options: { redirectTo: window.location.origin },
  });
}

export function signOut() {
  return supabase.auth.signOut();
}
