import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

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
    await supabase.auth.signOut();
  };

  return { user, session, loading, signUp, signIn, signOut };
};
