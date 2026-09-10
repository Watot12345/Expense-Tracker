import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Coins, Mail, Lock, Eye, EyeOff, ArrowRight, Sparkles } from 'lucide-react-native';
import { supabase, loginAsDemoUser } from '@/lib/supabase';
import { useTheme } from '@/hooks/useTheme';

export default function LoginScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleAuth = async () => {
    setErrorMsg('');
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter your email and password');
      return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        // Sign Up
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
          options: {
            data: { full_name: fullName.trim() },
          },
        });
        if (error) throw error;
        if (data.user) {
          router.replace('/auth/setup');
        }
      } else {
        // Sign In
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });
        if (error) throw error;
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.toLowerCase().includes('failed to fetch') || msg.toLowerCase().includes('network')) {
        setErrorMsg(
          'Cannot reach Supabase database (project may be paused or offline). You can restore it in the Supabase Dashboard, or tap "Explore in Demo Mode" below to continue!'
        );
      } else {
        setErrorMsg(err.message || 'Authentication failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    try {
      await loginAsDemoUser();
      router.replace('/(tabs)');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to start demo session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 justify-center p-6"
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
          {/* Logo & Branding */}
          <View className="items-center mb-8">
            <View className="w-16 h-16 rounded-3xl bg-indigo-600 items-center justify-center shadow-lg shadow-indigo-500/30 mb-4">
              <Coins size={32} color="#FFFFFF" />
            </View>
            <Text style={{ color: colors.text }} className="text-3xl font-black tracking-tight">
              PennyFlow
            </Text>
            <Text style={{ color: colors.muted }} className="text-sm font-medium mt-1">
              Smart spending, simple life
            </Text>
          </View>

          {/* Form Card */}
          <View
            style={{
              backgroundColor: isDark ? 'rgba(17, 24, 39, 0.8)' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(226, 232, 240, 0.8)',
            }}
            className="p-6 rounded-[32px] border shadow-xl"
          >
            <Text style={{ color: colors.text }} className="text-xl font-bold mb-5">
              {isRegister ? 'Create Account ✨' : 'Welcome back 👋'}
            </Text>

            {isRegister ? (
              <View className="mb-4">
                <Text style={{ color: colors.muted }} className="text-xs font-semibold mb-1.5 uppercase tracking-wider">
                  Full Name
                </Text>
                <TextInput
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Alex Johnson"
                  placeholderTextColor={colors.muted}
                  style={{
                    color: colors.text,
                    backgroundColor: isDark ? 'rgba(30, 41, 59, 0.6)' : '#F8FAFC',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
                  }}
                  className="py-3 px-4 rounded-2xl border text-sm font-medium"
                />
              </View>
            ) : null}

            {/* Email */}
            <View className="mb-4">
              <Text style={{ color: colors.muted }} className="text-xs font-semibold mb-1.5 uppercase tracking-wider">
                Email
              </Text>
              <View
                style={{
                  backgroundColor: isDark ? 'rgba(30, 41, 59, 0.6)' : '#F8FAFC',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
                }}
                className="flex-row items-center rounded-2xl border px-3.5 py-1"
              >
                <Mail size={16} color={colors.muted} />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholderTextColor={colors.muted}
                  style={{ color: colors.text }}
                  className="flex-1 ml-2.5 py-2.5 text-sm font-medium"
                />
              </View>
            </View>

            {/* Password */}
            <View className="mb-5">
              <Text style={{ color: colors.muted }} className="text-xs font-semibold mb-1.5 uppercase tracking-wider">
                Password
              </Text>
              <View
                style={{
                  backgroundColor: isDark ? 'rgba(30, 41, 59, 0.6)' : '#F8FAFC',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
                }}
                className="flex-row items-center rounded-2xl border px-3.5 py-1"
              >
                <Lock size={16} color={colors.muted} />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  secureTextEntry={!showPassword}
                  placeholderTextColor={colors.muted}
                  style={{ color: colors.text }}
                  className="flex-1 ml-2.5 py-2.5 text-sm font-medium"
                />
                <Pressable onPress={() => setShowPassword((p) => !p)}>
                  {showPassword ? <EyeOff size={16} color={colors.muted} /> : <Eye size={16} color={colors.muted} />}
                </Pressable>
              </View>
            </View>

            {/* Error message */}
            {errorMsg ? (
              <Text className="text-xs font-semibold text-rose-500 mb-4 text-center">
                {errorMsg}
              </Text>
            ) : null}

            {/* Submit Button */}
            <Pressable
              onPress={handleAuth}
              disabled={loading}
              className="py-4 rounded-2xl bg-indigo-600 active:bg-indigo-700 items-center justify-center flex-row space-x-2 shadow-lg mb-4"
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text className="text-white font-bold text-base mr-1">
                    {isRegister ? 'Sign Up' : 'Sign In'}
                  </Text>
                  <ArrowRight size={18} color="#FFFFFF" />
                </>
              )}
            </Pressable>

            {/* Toggle Sign In / Sign Up */}
            <Pressable
              onPress={() => {
                setErrorMsg('');
                setIsRegister((r) => !r);
              }}
              className="py-2 items-center"
            >
              <Text style={{ color: colors.muted }} className="text-xs font-medium">
                {isRegister ? 'Already have an account? ' : "Don't have an account? "}
                <Text className="text-indigo-500 font-bold">
                  {isRegister ? 'Sign In' : 'Sign Up'}
                </Text>
              </Text>
            </Pressable>

            {/* Divider */}
            <View className="flex-row items-center my-3">
              <View
                style={{ backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0' }}
                className="h-[1px] flex-1"
              />
              <Text style={{ color: colors.muted }} className="text-[11px] px-3 font-semibold">
                OR
              </Text>
              <View
                style={{ backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0' }}
                className="h-[1px] flex-1"
              />
            </View>

            {/* Demo Mode Button */}
            <Pressable
              onPress={handleDemoLogin}
              style={{
                backgroundColor: isDark ? 'rgba(99, 102, 241, 0.12)' : 'rgba(99, 102, 241, 0.08)',
                borderColor: isDark ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.25)',
              }}
              className="py-3.5 rounded-2xl border items-center justify-center flex-row active:opacity-80"
            >
              <Sparkles size={16} color="#818CF8" />
              <Text className="text-indigo-500 font-bold text-sm ml-2">
                Explore in Demo Mode (Offline)
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
