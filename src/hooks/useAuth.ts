import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { getSignUpRedirectUrl } from '@/lib/auth-redirects';

type SignUpPayload = {
  companyName: string;
  documentNumber: string;
  documentType: 'cpf' | 'cnpj';
  email: string;
  fullName: string;
  password: string;
  phone: string;
};

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const clearSupabaseAuthStorage = () => {
    if (typeof window === 'undefined') return;

    const clearFromStorage = (storage: Storage) => {
      const keysToRemove: string[] = [];
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (!key) continue;
        if (key.startsWith('sb-') || key.includes('supabase.auth') || key.includes('-auth-token')) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach((key) => storage.removeItem(key));
    };

    clearFromStorage(window.localStorage);
    clearFromStorage(window.sessionStorage);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async ({ email, password, fullName, companyName, phone, documentNumber, documentType }: SignUpPayload) => {
    const { error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        emailRedirectTo: getSignUpRedirectUrl(),
        data: {
          company_name: companyName,
          document_number: documentNumber,
          document_type: documentType,
          full_name: fullName,
          phone,
        },
      },
    });
    if (!error) {
      supabase.functions.invoke('send-system-email', {
        body: { type: 'onboarding', user_email: email, variables: { email } },
      }).catch(() => {});
    }
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut({ scope: 'local' });
    clearSupabaseAuthStorage();
    setSession(null);
    setUser(null);
  };

  return { user, session, loading, signUp, signIn, signOut };
};
