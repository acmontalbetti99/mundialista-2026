import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types/database';
import { translations, type Lang, type Translations } from '@/locales/translations';

// ---------------------------------------------------------------------------
// Auth store
// ---------------------------------------------------------------------------
interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  init: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const useAuth = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  loading: true,

  init: async () => {
    const { data } = await supabase.auth.getSession();
    set({ session: data.session, user: data.session?.user ?? null });
    if (data.session?.user) await get().refreshProfile();
    set({ loading: false });

    supabase.auth.onAuthStateChange(async (_event, session) => {
      set({ session, user: session?.user ?? null });
      if (session?.user) await get().refreshProfile();
      else set({ profile: null });
    });
  },

  signInWithGoogle: async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, profile: null });
  },

  refreshProfile: async () => {
    const user = get().user;
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (data) set({ profile: data as Profile });
  },
}));

// ---------------------------------------------------------------------------
// Language store
// ---------------------------------------------------------------------------
interface LangState {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Translations;
}

export const useLang = create<LangState>()(
  persist(
    (set) => ({
      lang: 'es' as Lang,
      t: translations.es as Translations,
      setLang: (lang) => set({ lang, t: translations[lang] as Translations }),
    }),
    {
      name: 'mundialista-lang',
      onRehydrateStorage: () => (state) => {
        if (state) state.t = translations[state.lang] as Translations;
      },
    }
  )
);
