import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { Child, getChildren } from '../lib/api';
import type { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  loadSession: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: true,

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    set({ user: data.user, loading: false });
  },

  signUp: async (email, password, name) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          consent: {
            version: '1.0',
            granted_at: new Date().toISOString(),
          },
        },
      },
    });
    if (error) throw error;
    // Don't auto-login after signup — user should confirm email if required,
    // then log in manually. This prevents the "signed up but can't login" issue.
    // If email confirmation is disabled in Supabase, signUp returns a session;
    // clear it so the explicit post-signup login flow remains deterministic.
    if (data.session) {
      await supabase.auth.signOut();
    }
    set({ user: null, loading: false });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    useApp.getState()._clearApp();
    set({ user: null });
  },

  loadSession: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    set({ user: session?.user ?? null, loading: false });
    // Subscribe AFTER initial session is set. Supabase fires INITIAL_SESSION
    // on subscription — ignore it to avoid double-setting user state which
    // confuses the auth redirect effect in _layout.tsx.
    supabase.auth.onAuthStateChange((_event, session) => {
      if (_event === 'INITIAL_SESSION') return;
      set({ user: session?.user ?? null, loading: false });
    });
  },
}));

interface AppState {
  selectedChild: Child | null;
  selectedChildId: string | null;
  children: Child[];
  setChildren: (children: Child[]) => void;
  selectChild: (child: Child) => void;
  loadChildren: () => Promise<void>;
  _clearApp: () => void;
}

export const useApp = create<AppState>()(
  persist(
    (set) => ({
      selectedChild: null,
      selectedChildId: null,
      children: [],
      setChildren: (children) => set({ children }),
      selectChild: (child) =>
        set({ selectedChild: child, selectedChildId: child.id }),
      loadChildren: async () => {
        const children = await getChildren();
        const persistedId = useApp.getState().selectedChildId;
        // Restore: prefer persisted ID, then first child, then null
        const selected =
          children.find((c) => c.id === persistedId) ??
          children[0] ??
          null;
        set({ children, selectedChild: selected });
      },
      _clearApp: () =>
        set({ selectedChild: null, selectedChildId: null, children: [] }),
    }),
    {
      name: 'smartparenting-app-state',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ selectedChildId: state.selectedChildId }),
    }
  )
);
