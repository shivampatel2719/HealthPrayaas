import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

import { login as loginRequest, type AuthUser } from '@/lib/auth-api';

const STORAGE_KEY = 'healthprayaas.session';

type Session = { token: string; user: AuthUser };

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  isHydrated: boolean;
  isLoggingIn: boolean;
  loginError: string | null;
  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

async function persistSession(session: Session | null) {
  if (session) {
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(session));
  } else {
    await SecureStore.deleteItemAsync(STORAGE_KEY);
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isHydrated: false,
  isLoggingIn: false,
  loginError: null,

  hydrate: async () => {
    const stored = await SecureStore.getItemAsync(STORAGE_KEY);
    if (stored) {
      const session: Session = JSON.parse(stored);
      set({ token: session.token, user: session.user });
    }
    set({ isHydrated: true });
  },

  login: async (email, password) => {
    set({ isLoggingIn: true, loginError: null });
    try {
      const result = await loginRequest(email, password);
      await persistSession({ token: result.accessToken, user: result.user });
      set({ token: result.accessToken, user: result.user, isLoggingIn: false });
    } catch (error) {
      set({
        isLoggingIn: false,
        loginError: error instanceof Error ? error.message : 'Could not log in',
      });
    }
  },

  logout: () => {
    persistSession(null);
    set({ token: null, user: null });
  },
}));
