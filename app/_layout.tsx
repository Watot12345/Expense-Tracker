import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '@/hooks/useTheme';
import { supabase, getDemoUser, loginAsDemoUser, DEMO_USER } from '@/lib/supabase';
import { View, ActivityIndicator } from 'react-native';
import { NativeWindStyleSheet } from 'nativewind';

// Force NativeWind to compile styles directly into JavaScript StyleSheets across all platforms including Web
NativeWindStyleSheet.setOutput({
  default: 'native',
});

function RootNavigation() {
  const { isDark, colors } = useTheme();
  const [initializing, setInitializing] = useState(true);
  const [session, setSession] = useState<any>(null);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const demo = await getDemoUser();
        if (demo) {
          setSession({ user: demo });
          setInitializing(false);
          return;
        }
      } catch {}

      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (currentSession) {
          setSession(currentSession);
          setInitializing(false);
          return;
        }
      } catch {}

      // Default to demo mode so user can test and use the app immediately without any network blockers
      try {
        await loginAsDemoUser();
        setSession({ user: DEMO_USER });
      } catch {}

      setInitializing(false);
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (newSession) {
        setSession(newSession);
        setInitializing(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (initializing) return;

    const inAuthGroup = segments[0] === 'auth';

    if (!session && !inAuthGroup) {
      // Redirect to login if unauthenticated
      router.replace('/auth/login');
    } else if (session && inAuthGroup) {
      // Redirect to dashboard if already authenticated
      router.replace('/(tabs)');
    }
  }, [session, initializing, segments, router]);

  if (initializing) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth/login" options={{ headerShown: false }} />
        <Stack.Screen name="auth/setup" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <RootNavigation />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
