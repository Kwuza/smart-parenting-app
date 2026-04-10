import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Child, getChildren } from '../lib/api';

interface AuthState {
  user: any | null;
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
    set({ user: data.user });
  },

  signUp: async (email, password, name) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) throw error;
    // Don't auto-login after signup — user should confirm email if required,
    // then log in manually. This prevents the "signed up but can't login" issue.
    // If email confirmation is disabled in Supabase, the user can still log in after.
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null });
  },

  loadSession: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    set({ user: session?.user ?? null, loading: false });
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ user: session?.user ?? null, loading: false });
    });
  },
}));

interface AppState {
  selectedChild: Child | null;
  children: Child[];
  setChildren: (children: Child[]) => void;
  selectChild: (child: Child) => void;
  loadChildren: () => Promise<void>;
}

export const useApp = create<AppState>((set) => ({
  selectedChild: null,
  children: [],
  setChildren: (children) => set({ children }),
  selectChild: (child) => set({ selectedChild: child }),
  loadChildren: async () => {
    const children = await getChildren();
    set({ children, selectedChild: children[0] ?? null });
  },
}));
