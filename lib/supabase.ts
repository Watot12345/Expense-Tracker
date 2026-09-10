import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

import { Platform } from 'react-native';

export const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://islpjlryvtakwjmcaecd.supabase.co';
export const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzbHBqbHJ5dnRha3dqbWNhZWNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4NjExODEsImV4cCI6MjA5NzQzNzE4MX0.jfdzy6qxZDX6CYjx2_jFk7CvsmqSDrMqGBPTms4Lqr0';

export const DEMO_USER_KEY = '@pennyflow_demo_user';

export const DEMO_USER = {
  id: 'demo-user-123',
  email: 'jordan.vance@pennyflow.app',
  user_metadata: { full_name: 'Jordan Vance' },
};

export async function loginAsDemoUser() {
  await AsyncStorage.setItem(DEMO_USER_KEY, JSON.stringify(DEMO_USER));
}

export async function getDemoUser() {
  try {
    const saved = await AsyncStorage.getItem(DEMO_USER_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

export async function clearDemoUser() {
  try {
    await AsyncStorage.removeItem(DEMO_USER_KEY);
  } catch {
    // ignore
  }
}

// Detect whether code is currently running in a server-side environment (Node.js during SSR)
// where `window` and `localStorage` do not exist.
const isServer =
  typeof window === 'undefined' ||
  (typeof process !== 'undefined' && Boolean(process.versions?.node));

const safeStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (isServer) {
      return null;
    }
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (isServer) {
      return;
    }
    try {
      await AsyncStorage.setItem(key, value);
    } catch {
      // ignore in SSR or restricted environments
    }
  },
  removeItem: async (key: string): Promise<void> => {
    if (isServer) {
      return;
    }
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      // ignore in SSR or restricted environments
    }
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: safeStorage,
    autoRefreshToken: !isServer,
    persistSession: !isServer,
    detectSessionInUrl: false,
  },
});
