import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Coins, Check, ArrowRight, User, DollarSign } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/hooks/useTheme';

const CURRENCIES = [
  { code: 'USD', label: '🇺🇸 USD ($)' },
  { code: 'PHP', label: '🇵🇭 PHP (₱)' },
  { code: 'EUR', label: '🇪🇺 EUR (€)' },
  { code: 'GBP', label: '🇬🇧 GBP (£)' },
  { code: 'INR', label: '🇮🇳 INR (₹)' },
];

export default function SetupScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading] = useState(false);

  const handleFinish = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // 1. Update Profile
        await supabase.from('profiles').upsert({
          id: user.id,
          full_name: name.trim() || 'User',
          currency,
          monthly_budget: 1000,
        });

        // 2. Add starting balance as initial income if > 0
        const initialAmt = parseFloat(balance);
        if (!isNaN(initialAmt) && initialAmt > 0) {
          await supabase.from('income').insert([
            {
              user_id: user.id,
              amount: initialAmt,
              source: 'Starting Balance',
              frequency: 'one-time',
              income_date: new Date().toISOString(),
            },
          ]);
        }
      }
      router.replace('/(tabs)');
    } catch (e) {
      console.error('Setup error', e);
      router.replace('/(tabs)');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
        {/* Header */}
        <View className="items-center mb-6">
          <View className="w-14 h-14 rounded-3xl bg-indigo-600 items-center justify-center shadow-lg shadow-indigo-500/30 mb-3">
            <Coins size={28} color="#FFFFFF" />
          </View>
          <Text style={{ color: colors.text }} className="text-2xl font-black tracking-tight">
            Welcome to PennyFlow! 🎉
          </Text>
          <Text style={{ color: colors.muted }} className="text-xs font-medium mt-1">
            Let's get you set up in 3 quick steps
          </Text>
        </View>

        {/* Step Indicator Dots */}
        <View className="flex-row justify-center space-x-2 mb-8">
          {[1, 2, 3].map((s) => (
            <View
              key={s}
              style={{
                backgroundColor: s === step ? '#6366F1' : isDark ? '#334155' : '#E2E8F0',
                width: s === step ? 28 : 8,
              }}
              className="h-2 rounded-full"
            />
          ))}
        </View>

        {/* Step Card */}
        <View
          style={{
            backgroundColor: isDark ? 'rgba(17, 24, 39, 0.8)' : '#FFFFFF',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(226, 232, 240, 0.8)',
          }}
          className="p-6 rounded-[32px] border shadow-xl"
        >
          {/* STEP 1: Name */}
          {step === 1 ? (
            <View>
              <Text style={{ color: colors.text }} className="text-lg font-bold mb-1">
                What's your name?
              </Text>
              <Text style={{ color: colors.muted }} className="text-xs mb-5">
                We'll use this to personalize your dashboard
              </Text>

              <View
                style={{
                  backgroundColor: isDark ? 'rgba(30, 41, 59, 0.6)' : '#F8FAFC',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
                }}
                className="flex-row items-center rounded-2xl border px-3.5 py-1 mb-6"
              >
                <User size={16} color={colors.muted} />
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Alex Johnson"
                  placeholderTextColor={colors.muted}
                  style={{ color: colors.text }}
                  className="flex-1 ml-2.5 py-2.5 text-sm font-medium"
                  autoFocus
                />
              </View>

              <Pressable
                onPress={() => setStep(2)}
                disabled={!name.trim()}
                className="py-3.5 rounded-2xl bg-indigo-600 active:bg-indigo-700 flex-row items-center justify-center space-x-2"
              >
                <Text className="text-white font-bold text-sm mr-1">Next Step</Text>
                <ArrowRight size={16} color="#FFFFFF" />
              </Pressable>
            </View>
          ) : null}

          {/* STEP 2: Starting Balance */}
          {step === 2 ? (
            <View>
              <Text style={{ color: colors.text }} className="text-lg font-bold mb-1">
                Starting balance?
              </Text>
              <Text style={{ color: colors.muted }} className="text-xs mb-5">
                How much money do you currently have available?
              </Text>

              <View
                style={{
                  backgroundColor: isDark ? 'rgba(30, 41, 59, 0.6)' : '#F8FAFC',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
                }}
                className="flex-row items-center rounded-2xl border px-3.5 py-1 mb-6"
              >
                <DollarSign size={16} color={colors.muted} />
                <TextInput
                  value={balance}
                  onChangeText={setBalance}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  placeholderTextColor={colors.muted}
                  style={{ color: colors.text }}
                  className="flex-1 ml-2.5 py-2.5 text-sm font-bold"
                  autoFocus
                />
              </View>

              <View className="flex-row space-x-2">
                <Pressable
                  onPress={() => setStep(1)}
                  className="py-3.5 px-4 rounded-2xl bg-slate-700/20"
                >
                  <Text style={{ color: colors.muted }} className="font-bold text-sm">
                    Back
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setStep(3)}
                  className="flex-1 py-3.5 rounded-2xl bg-indigo-600 active:bg-indigo-700 flex-row items-center justify-center space-x-2"
                >
                  <Text className="text-white font-bold text-sm mr-1">Next Step</Text>
                  <ArrowRight size={16} color="#FFFFFF" />
                </Pressable>
              </View>
            </View>
          ) : null}

          {/* STEP 3: Currency */}
          {step === 3 ? (
            <View>
              <Text style={{ color: colors.text }} className="text-lg font-bold mb-1">
                Select your currency
              </Text>
              <Text style={{ color: colors.muted }} className="text-xs mb-4">
                You can change this anytime from Settings
              </Text>

              <View className="space-y-2 mb-6">
                {CURRENCIES.map((c) => {
                  const isSelected = currency === c.code;
                  return (
                    <Pressable
                      key={c.code}
                      onPress={() => setCurrency(c.code)}
                      style={{
                        backgroundColor: isSelected
                          ? 'rgba(99, 102, 241, 0.15)'
                          : isDark
                          ? 'rgba(30, 41, 59, 0.4)'
                          : '#F8FAFC',
                        borderColor: isSelected ? '#6366F1' : isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
                      }}
                      className="p-3.5 rounded-2xl border flex-row justify-between items-center"
                    >
                      <Text style={{ color: colors.text }} className="text-sm font-bold">
                        {c.label}
                      </Text>
                      {isSelected ? <Check size={18} color="#6366F1" /> : null}
                    </Pressable>
                  );
                })}
              </View>

              <Pressable
                onPress={handleFinish}
                disabled={loading}
                className="py-4 rounded-2xl bg-indigo-600 active:bg-indigo-700 items-center justify-center shadow-lg"
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="text-white font-bold text-base">Complete Setup 🚀</Text>
                )}
              </Pressable>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
