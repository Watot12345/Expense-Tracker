import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogOut, Download, Moon, Sun, Save, Check, Plus } from 'lucide-react-native';
import { useSupabase } from '@/hooks/useSupabase';
import { useTheme } from '@/hooks/useTheme';
import { GlassCard } from '@/components/GlassCard';
import { PennyFlowLogo } from '@/components/PennyFlowLogo';
import { exportExpensesCSV } from '@/lib/csvExport';
import { getCurrencySymbol, formatCurrency } from '@/lib/pennyAI';

const CURRENCIES = [
  { code: 'USD', label: 'USD ($)' },
  { code: 'PHP', label: 'PHP (₱)' },
  { code: 'EUR', label: 'EUR (€)' },
  { code: 'GBP', label: 'GBP (£)' },
  { code: 'INR', label: 'INR (₹)' },
  { code: 'JPY', label: 'JPY (¥)' },
  { code: 'CAD', label: 'CAD (CA$)' },
  { code: 'AUD', label: 'AUD (A$)' },
  { code: 'SGD', label: 'SGD (S$)' },
];

export default function ProfileScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const { user, profile, expenses, updateProfile, signOut } = useSupabase();

  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [customCurrencyInput, setCustomCurrencyInput] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [budget, setBudget] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.full_name || '');
      const profCurr = (profile.currency || 'USD').trim();
      setCurrency(profCurr);
      const isPreset = CURRENCIES.some((c) => c.code.toUpperCase() === profCurr.toUpperCase());
      if (!isPreset && profCurr) {
        setIsCustomMode(true);
        setCustomCurrencyInput(profCurr);
      } else {
        setIsCustomMode(false);
      }
      setBudget(profile.monthly_budget ? profile.monthly_budget.toString() : '1000');
    }
  }, [profile]);

  const handleSelectPresetCurrency = async (code: string) => {
    setIsCustomMode(false);
    setCurrency(code);
    await updateProfile({
      full_name: name.trim() || profile?.full_name || 'User',
      currency: code,
      monthly_budget: parseFloat(budget) || profile?.monthly_budget || 1000,
    });
  };

  const handleCustomCurrencyChange = (val: string) => {
    setCustomCurrencyInput(val);
    const trimmed = val.trim();
    if (trimmed) {
      setCurrency(trimmed);
    }
  };

  const handleApplyCustomCurrency = async () => {
    const finalCurr = customCurrencyInput.trim() || 'USD';
    setCurrency(finalCurr);
    const success = await updateProfile({
      full_name: name.trim() || profile?.full_name || 'User',
      currency: finalCurr,
      monthly_budget: parseFloat(budget) || profile?.monthly_budget || 1000,
    });
    if (success) {
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    }
  };

  const handleSave = async () => {
    const budgetNum = parseFloat(budget) || 1000;
    const finalCurrency = isCustomMode
      ? customCurrencyInput.trim() || currency || 'USD'
      : currency || 'USD';
    setCurrency(finalCurrency);

    const success = await updateProfile({
      full_name: name.trim(),
      currency: finalCurrency,
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
  const activeCurrency = isCustomMode
    ? customCurrencyInput.trim() || currency || 'USD'
    : currency || 'USD';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'left', 'right']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 116 }}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Settings & Profile
          </Text>
          <PennyFlowLogo size={36} animated={false} />
        </View>

        {/* User Card */}
        <View style={styles.userSection}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitial}>{initial}</Text>
          </View>
          <Text style={[styles.userName, { color: colors.text }]}>
            {name || 'User'}
          </Text>
          <Text style={[styles.userEmail, { color: colors.muted }]}>
            {user?.email}
          </Text>
        </View>

        {/* Profile Settings */}
        <GlassCard className="mb-4">
          <Text style={[styles.sectionHeader, { color: colors.muted }]}>
            PERSONALIZATION
          </Text>

          {/* Full Name */}
          <View style={styles.fieldBlock}>
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>
              Full Name
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={colors.muted}
              style={[
                styles.input,
                {
                  color: colors.text,
                  backgroundColor: isDark ? '#162033' : '#F8FAFC',
                  borderColor: colors.border,
                },
              ]}
            />
          </View>

          {/* Monthly Budget */}
          <View style={styles.fieldBlock}>
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>
              Monthly Budget Limit ({getCurrencySymbol(activeCurrency)})
            </Text>
            <TextInput
              value={budget}
              onChangeText={setBudget}
              placeholder="1000.00"
              keyboardType="decimal-pad"
              placeholderTextColor={colors.muted}
              style={[
                styles.input,
                {
                  color: colors.text,
                  backgroundColor: isDark ? '#162033' : '#F8FAFC',
                  borderColor: colors.border,
                  fontWeight: '700',
                },
              ]}
            />
          </View>

          {/* Currency Choice + Custom Currency */}
          <View style={{ marginBottom: 18 }}>
            <View style={styles.currencyLabelRow}>
              <Text style={[styles.fieldLabel, { color: colors.muted, marginBottom: 0 }]}>
                Currency
              </Text>
              <Text style={[styles.currencyPreview, { color: '#10B981' }]}>
                Preview: {formatCurrency(1250, activeCurrency)}
              </Text>
            </View>

            <View style={styles.chipsWrap}>
              {CURRENCIES.map((curr) => {
                const isSelected = !isCustomMode && currency.toUpperCase() === curr.code;
                return (
                  <Pressable
                    key={curr.code}
                    onPress={() => handleSelectPresetCurrency(curr.code)}
                    style={[
                      styles.currencyChip,
                      {
                        backgroundColor: isSelected
                          ? '#6366F1'
                          : isDark
                          ? '#162033'
                          : '#F1F5F9',
                        borderColor: isSelected ? '#6366F1' : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.currencyChipText,
                        { color: isSelected ? '#FFFFFF' : colors.text },
                      ]}
                    >
                      {curr.label}
                    </Text>
                  </Pressable>
                );
              })}

              {/* Custom Currency Toggle Chip */}
              <Pressable
                onPress={() => {
                  setIsCustomMode(true);
                  if (!customCurrencyInput.trim()) {
                    setCustomCurrencyInput(currency);
                  }
                }}
                style={[
                  styles.currencyChip,
                  {
                    backgroundColor: isCustomMode
                      ? '#6366F1'
                      : isDark
                      ? '#162033'
                      : '#F1F5F9',
                    borderColor: isCustomMode ? '#6366F1' : colors.border,
                  },
                ]}
              >
                <Plus size={12} color={isCustomMode ? '#FFFFFF' : colors.text} style={{ marginRight: 4 }} />
                <Text
                  style={[
                    styles.currencyChipText,
                    { color: isCustomMode ? '#FFFFFF' : colors.text },
                  ]}
                >
                  Custom
                </Text>
              </Pressable>
            </View>

            {/* Custom Currency Code / Symbol Input */}
            {isCustomMode ? (
              <View style={styles.customCurrencyRow}>
                <TextInput
                  value={customCurrencyInput}
                  onChangeText={handleCustomCurrencyChange}
                  onSubmitEditing={handleApplyCustomCurrency}
                  placeholder="Enter code or symbol (e.g. KRW, MYR, ₩, ฿, CHF)"
                  placeholderTextColor={colors.muted}
                  maxLength={8}
                  autoCapitalize="characters"
                  style={[
                    styles.customCurrencyInput,
                    {
                      color: colors.text,
                      backgroundColor: isDark ? '#162033' : '#F8FAFC',
                      borderColor: '#6366F1',
                    },
                  ]}
                />
                <Pressable
                  onPress={handleApplyCustomCurrency}
                  style={styles.applyCustomBtn}
                >
                  <Text style={styles.applyCustomBtnText}>Apply</Text>
                </Pressable>
              </View>
            ) : null}
          </View>

          {/* Save Button */}
          <Pressable
            onPress={handleSave}
            style={[
              styles.saveBtn,
              { backgroundColor: savedSuccess ? '#10B981' : '#6366F1' },
            ]}
          >
            {savedSuccess ? (
              <>
                <Check size={16} color="#FFFFFF" />
                <Text style={styles.saveBtnText}>Changes Saved!</Text>
              </>
            ) : (
              <>
                <Save size={16} color="#FFFFFF" />
                <Text style={styles.saveBtnText}>Save Profile</Text>
              </>
            )}
          </Pressable>
        </GlassCard>

        {/* Preferences & Actions */}
        <GlassCard className="mb-4">
          <Text style={[styles.sectionHeader, { color: colors.muted }]}>
            PREFERENCES & DATA
          </Text>

          {/* Theme Toggle Row */}
          <Pressable
            onPress={toggleTheme}
            style={[styles.prefRow, { borderBottomColor: colors.border }]}
          >
            <View style={styles.prefLeft}>
              {isDark ? <Sun size={18} color="#FBBF24" /> : <Moon size={18} color="#6366F1" />}
              <Text style={[styles.prefTitle, { color: colors.text }]}>
                Appearance
              </Text>
            </View>
            <Text style={[styles.prefValue, { color: colors.muted }]}>
              {isDark ? 'Obsidian Dark' : 'Studio Light'}
            </Text>
          </Pressable>

          {/* CSV Export Row */}
          <Pressable
            onPress={() => exportExpensesCSV(expenses)}
            style={[styles.prefRow, { borderBottomColor: colors.border }]}
          >
            <View style={styles.prefLeft}>
              <Download size={18} color="#10B981" />
              <Text style={[styles.prefTitle, { color: colors.text }]}>
                Export Transactions
              </Text>
            </View>
            <Text style={[styles.prefValue, { color: colors.muted }]}>
              CSV
            </Text>
          </Pressable>

          {/* Logout Row */}
          <Pressable onPress={handleLogout} style={styles.logoutRow}>
            <View style={styles.prefLeft}>
              <LogOut size={18} color="#EF4444" />
              <Text style={styles.logoutText}>Sign Out</Text>
            </View>
          </Pressable>
        </GlassCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 18,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  userSection: {
    alignItems: 'center',
    marginVertical: 14,
  },
  avatarCircle: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: 'rgba(99, 102, 241, 0.16)',
    borderWidth: 2,
    borderColor: 'rgba(99, 102, 241, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  avatarInitial: {
    fontSize: 28,
    fontWeight: '900',
    color: '#6366F1',
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
  },
  userEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  fieldBlock: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 14,
  },
  currencyLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  currencyPreview: {
    fontSize: 11,
    fontWeight: '800',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  currencyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  currencyChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  customCurrencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
  },
  customCurrencyInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    fontSize: 13,
    fontWeight: '700',
  },
  applyCustomBtn: {
    backgroundColor: '#6366F1',
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyCustomBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  saveBtn: {
    paddingVertical: 13,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
    marginLeft: 6,
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    borderBottomWidth: 1,
  },
  prefLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  prefTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 10,
  },
  prefValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F43F5E',
    marginLeft: 10,
  },
});
