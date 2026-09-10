import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, LogOut, Download, Moon, Sun, Save, Check } from 'lucide-react-native';
import { useSupabase } from '@/hooks/useSupabase';
import { useTheme } from '@/hooks/useTheme';
import { GlassCard } from '@/components/GlassCard';
import { exportExpensesCSV } from '@/lib/csvExport';

const CURRENCIES = [
  { code: 'USD', label: '🇺🇸 USD ($)' },
  { code: 'PHP', label: '🇵🇭 PHP (₱)' },
  { code: 'EUR', label: '🇪🇺 EUR (€)' },
  { code: 'GBP', label: '🇬🇧 GBP (£)' },
  { code: 'INR', label: '🇮🇳 INR (₹)' },
];

export default function ProfileScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const { user, profile, expenses, updateProfile, signOut } = useSupabase();

  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [budget, setBudget] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.full_name || '');
      setCurrency(profile.currency || 'USD');
      setBudget(profile.monthly_budget ? profile.monthly_budget.toString() : '1000');
    }
  }, [profile]);

  const handleSave = async () => {
    const budgetNum = parseFloat(budget) || 1000;
    const success = await updateProfile({
      full_name: name.trim(),
      currency,
      monthly_budget: budgetNum,
    });
    if (success) {
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    }
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  const initial = (name || user?.email || '?').charAt(0).toUpperCase();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'left', 'right']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
      >
        {/* Header */}
        <View className="mt-2 mb-5">
          <Text style={{ color: colors.text }} className="text-2xl font-black tracking-tight">
            Settings & Profile ⚙️
          </Text>
        </View>

        {/* User Card */}
        <View className="items-center my-4">
          <View className="w-20 h-20 rounded-full bg-indigo-500/20 border-2 border-indigo-500/40 items-center justify-center mb-3">
            <Text className="text-3xl font-black text-indigo-500">{initial}</Text>
          </View>
          <Text style={{ color: colors.text }} className="text-lg font-bold">
            {name || 'User'}
          </Text>
          <Text style={{ color: colors.muted }} className="text-xs">
            {user?.email}
          </Text>
        </View>

        {/* Profile Settings */}
        <GlassCard className="mb-4">
          <Text style={{ color: colors.muted }} className="text-xs font-bold uppercase tracking-wider mb-3">
            Personalization
          </Text>

          {/* Full Name */}
          <View className="mb-4">
            <Text style={{ color: colors.muted }} className="text-xs font-semibold mb-1.5">
              Full Name
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={colors.muted}
              style={{
                color: colors.text,
                backgroundColor: isDark ? 'rgba(30, 41, 59, 0.6)' : '#F8FAFC',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
              }}
              className="py-2.5 px-3.5 rounded-xl border text-sm"
            />
          </View>

          {/* Monthly Budget */}
          <View className="mb-4">
            <Text style={{ color: colors.muted }} className="text-xs font-semibold mb-1.5">
              Monthly Budget Limit ({currency})
            </Text>
            <TextInput
              value={budget}
              onChangeText={setBudget}
              placeholder="1000.00"
              keyboardType="decimal-pad"
              placeholderTextColor={colors.muted}
              style={{
                color: colors.text,
                backgroundColor: isDark ? 'rgba(30, 41, 59, 0.6)' : '#F8FAFC',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
              }}
              className="py-2.5 px-3.5 rounded-xl border text-sm font-semibold"
            />
          </View>

          {/* Currency Choice */}
          <View className="mb-5">
            <Text style={{ color: colors.muted }} className="text-xs font-semibold mb-2">
              Currency
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {CURRENCIES.map((curr) => {
                const isSelected = currency === curr.code;
                return (
                  <Pressable
                    key={curr.code}
                    onPress={() => setCurrency(curr.code)}
                    style={{
                      backgroundColor: isSelected ? '#6366F1' : isDark ? '#1E293B' : '#F1F5F9',
                    }}
                    className="py-2 px-3 rounded-xl mr-1 mb-1 active:scale-95"
                  >
                    <Text
                      style={{ color: isSelected ? '#FFFFFF' : colors.text }}
                      className="text-xs font-bold"
                    >
                      {curr.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Save Button */}
          <Pressable
            onPress={handleSave}
            className="py-3 rounded-xl bg-indigo-600 active:bg-indigo-700 flex-row items-center justify-center space-x-2"
          >
            {savedSuccess ? (
              <>
                <Check size={16} color="#FFFFFF" />
                <Text className="text-white font-bold text-xs ml-1">Changes Saved!</Text>
              </>
            ) : (
              <>
                <Save size={16} color="#FFFFFF" />
                <Text className="text-white font-bold text-xs ml-1">Save Profile</Text>
              </>
            )}
          </Pressable>
        </GlassCard>

        {/* Preferences & Actions */}
        <GlassCard className="mb-4">
          <Text style={{ color: colors.muted }} className="text-xs font-bold uppercase tracking-wider mb-3">
            Preferences & Data
          </Text>

          {/* Theme Toggle Row */}
          <Pressable
            onPress={toggleTheme}
            className="flex-row items-center justify-between py-3 border-b border-slate-700/20 active:opacity-70"
          >
            <View className="flex-row items-center space-x-3">
              {isDark ? <Sun size={18} color="#FBBF24" /> : <Moon size={18} color="#6366F1" />}
              <Text style={{ color: colors.text }} className="text-sm font-semibold ml-2">
                Appearance
              </Text>
            </View>
            <Text style={{ color: colors.muted }} className="text-xs font-bold">
              {isDark ? 'Obsidian Dark' : 'Studio Light'}
            </Text>
          </Pressable>

          {/* CSV Export Row */}
          <Pressable
            onPress={() => exportExpensesCSV(expenses)}
            className="flex-row items-center justify-between py-3 border-b border-slate-700/20 active:opacity-70"
          >
            <View className="flex-row items-center space-x-3">
              <Download size={18} color="#10B981" />
              <Text style={{ color: colors.text }} className="text-sm font-semibold ml-2">
                Export Transactions
              </Text>
            </View>
            <Text style={{ color: colors.muted }} className="text-xs font-bold">
              CSV
            </Text>
          </Pressable>

          {/* Logout Row */}
          <Pressable
            onPress={handleLogout}
            className="flex-row items-center justify-between py-3 active:opacity-70"
          >
            <View className="flex-row items-center space-x-3">
              <LogOut size={18} color="#EF4444" />
              <Text className="text-sm font-semibold text-rose-500 ml-2">Sign Out</Text>
            </View>
          </Pressable>
        </GlassCard>
      </ScrollView>
    </SafeAreaView>
  );
}
