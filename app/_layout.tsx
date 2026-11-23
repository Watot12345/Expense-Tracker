import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '@/hooks/useTheme';
import { supabase, getDemoUser, loginAsDemoUser, DEMO_USER } from '@/lib/supabase';
import { PennyFlowLogo } from '@/components/PennyFlowLogo';
import {
  View,
  Text,
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { Smartphone, Maximize2 } from 'lucide-react-native';
import { NativeWindStyleSheet } from 'nativewind';

// Force NativeWind to compile styles directly into JavaScript StyleSheets across all platforms including Web
NativeWindStyleSheet.setOutput({
  default: 'native',
});

function RootNavigation() {
  const { isDark, colors } = useTheme();
  const [initializing, setInitializing] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [phoneFrameMode, setPhoneFrameMode] = useState(true);
  const { width: windowWidth } = useWindowDimensions();
  const segments = useSegments();
  const router = useRouter();

  const isDesktopWeb = Platform.OS === 'web' && windowWidth > 540;

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
      router.replace('/auth/login');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [session, initializing, segments, router]);

  const content = initializing ? (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
      <PennyFlowLogo size={80} animated />
      <Text style={{ color: colors.text, fontSize: 24, fontWeight: '900', letterSpacing: -0.6, marginTop: 18 }}>
        Penny<Text style={{ color: '#10B981' }}>Flow</Text>
      </Text>
      <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '500', marginTop: 4, marginBottom: 20 }}>
        Smart spending, effortless clarity
      </Text>
      <ActivityIndicator size="small" color="#6366F1" />
    </View>
  ) : (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth/login" options={{ headerShown: false }} />
        <Stack.Screen name="auth/setup" options={{ headerShown: false }} />
      </Stack>
    </>
  );

  if (!isDesktopWeb) {
    return content;
  }

  return (
    <View
      style={[
        styles.desktopBackdrop,
        { backgroundColor: isDark ? '#03060C' : '#E2E8F0' },
      ]}
    >
      {/* Top Viewport Switcher Bar on Desktop Web */}
      <View
        style={[
          styles.topToolbar,
          {
            backgroundColor: isDark ? '#101726' : '#FFFFFF',
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.toolbarBrand}>
          <PennyFlowLogo size={26} animated={false} />
          <Text style={[styles.toolbarTitle, { color: colors.text }]}>
            Penny<Text style={{ color: '#10B981' }}>Flow</Text> Mobile
          </Text>
        </View>

        <Pressable
          onPress={() => setPhoneFrameMode((prev) => !prev)}
          style={[
            styles.toggleFrameBtn,
            {
              backgroundColor: phoneFrameMode ? '#6366F1' : isDark ? '#162033' : '#F1F5F9',
            },
          ]}
        >
          {phoneFrameMode ? (
            <>
              <Maximize2 size={13} color="#FFFFFF" />
              <Text style={styles.toggleFrameTextActive}>Full Width</Text>
            </>
          ) : (
            <>
              <Smartphone size={13} color={colors.text} />
              <Text style={[styles.toggleFrameTextInactive, { color: colors.text }]}>
                Phone View
              </Text>
            </>
          )}
        </Pressable>
      </View>

      {/* Phone Device Frame or Full Container */}
      <View
        style={[
          styles.viewportShell,
          phoneFrameMode ? styles.phoneFrame : styles.fullFrame,
          {
            backgroundColor: colors.bg,
            borderColor: isDark ? '#1E293B' : '#CBD5E1',
          },
        ]}
      >
        {content}
      </View>
    </View>
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

const styles = StyleSheet.create({
  desktopBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  topToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 430,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  toolbarBrand: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toolbarTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginLeft: 8,
  },
  toggleFrameBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  toggleFrameTextActive: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 5,
  },
  toggleFrameTextInactive: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 5,
  },
  viewportShell: {
    flex: 1,
    width: '100%',
    overflow: 'hidden',
  },
  phoneFrame: {
    maxWidth: 430,
    maxHeight: 860,
    borderRadius: 36,
    borderWidth: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.35,
    shadowRadius: 32,
    elevation: 16,
  },
  fullFrame: {
    maxWidth: 960,
    borderRadius: 20,
    borderWidth: 1,
  },
});
