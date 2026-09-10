import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  Landmark,
  X,
  RefreshCw,
  Plus,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  CreditCard,
  ShieldCheck,
  Building2,
  Trash2,
  Sparkles,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { ConnectedAccount, ExternalSyncResult } from '@/types/account';
import { formatCurrency } from '@/lib/pennyAI';

const AVAILABLE_BANKS = [
  { name: 'GCash', logoColor: '#005CE6', type: 'other' as const, mask: '9174' },
  { name: 'Maya', logoColor: '#00D664', type: 'other' as const, mask: '8820' },
  { name: 'PayPal', logoColor: '#003087', type: 'other' as const, mask: '5512' },
  { name: 'Apple Card', logoColor: '#1E293B', type: 'credit' as const, mask: '1084' },
  { name: 'Chase Sapphire Preferred', logoColor: '#1170CF', type: 'checking' as const, mask: '4821' },
  { name: 'American Express Gold', logoColor: '#006FCF', type: 'credit' as const, mask: '1004' },
  { name: 'Bank of America', logoColor: '#E31837', type: 'checking' as const, mask: '3310' },
  { name: 'Revolut', logoColor: '#0075EB', type: 'checking' as const, mask: '9921' },
  { name: 'Monzo', logoColor: '#EB605A', type: 'checking' as const, mask: '5420' },
  { name: 'Capital One Venture', logoColor: '#004977', type: 'credit' as const, mask: '7712' },
];

interface ConnectedAccountsModalProps {
  visible: boolean;
  accounts: ConnectedAccount[];
  currencySymbol?: string;
  isPro?: boolean;
  onClose: () => void;
  onLinkAccount: (institutionName: string) => Promise<ConnectedAccount>;
  onSyncAccount: (account?: ConnectedAccount) => Promise<ExternalSyncResult>;
  onDisconnectAccount: (accountId: string) => Promise<boolean>;
  onOpenPaywall?: () => void;
}

export const ConnectedAccountsModal: React.FC<ConnectedAccountsModalProps> = ({
  visible,
  accounts,
  currencySymbol = '$',
  isPro = false,
  onClose,
  onLinkAccount,
  onSyncAccount,
  onDisconnectAccount,
  onOpenPaywall,
}) => {
  const { colors, isDark } = useTheme();

  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [linkingBank, setLinkingBank] = useState<string | null>(null);
  const [syncResultBanner, setSyncResultBanner] = useState<string | null>(null);

  const handleSync = async (account?: ConnectedAccount) => {
    if (account) setSyncingId(account.id);
    else setSyncingAll(true);
    setSyncResultBanner(null);

    try {
      const res = await onSyncAccount(account);
      if (res.importedCount > 0) {
        setSyncResultBanner(
          `✨ ${res.importedCount} new transaction(s) imported & categorized by Gemini AI!`
        );
      } else {
        setSyncResultBanner('✓ Up to date. Zero duplicates found.');
      }
    } catch (err: any) {
      Alert.alert('Sync Error', err.message || 'Could not complete bank sync.');
    } finally {
      setSyncingId(null);
      setSyncingAll(false);
    }
  };

  const handleLink = async (instName: string) => {
    if (!isPro && accounts.length >= 1) {
      Alert.alert(
        'Pro Feature: Unlimited Bank Sync',
        'Free accounts can connect 1 financial institution. Upgrade to PennyFlow Pro to link unlimited bank accounts and cards!',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Upgrade to Pro',
            onPress: () => {
              onClose();
              if (onOpenPaywall) onOpenPaywall();
            },
          },
        ]
      );
      return;
    }
    setLinkingBank(instName);
    try {
      await onLinkAccount(instName);
      Alert.alert('Account Linked', `Successfully connected to ${instName} via Open Banking standard.`);
    } catch (err: any) {
      Alert.alert('Connection Failed', err.message || 'Unable to link institution.');
    } finally {
      setLinkingBank(null);
    }
  };

  const handleDisconnect = (account: ConnectedAccount) => {
    Alert.alert(
      'Disconnect Account',
      `Unlink ${account.institution_name} (${account.account_mask || '••••'})? Existing imported expenses will remain saved.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: () => onDisconnectAccount(account.id),
        },
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-end bg-black/70"
      >
        <View
          style={{
            backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
            borderTopColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#E2E8F0',
          }}
          className="p-6 rounded-t-[36px] border-t max-h-[92%]"
        >
          {/* Header */}
          <View className="flex-row justify-between items-center mb-4">
            <View className="flex-row items-center space-x-2">
              <View className="w-10 h-10 rounded-2xl bg-indigo-500/20 items-center justify-center mr-2.5">
                <Landmark size={20} color="#6366F1" />
              </View>
              <View>
                <Text style={{ color: colors.text }} className="text-xl font-black">
                  Bank & App Sync
                </Text>
                <View className="flex-row items-center">
                  <ShieldCheck size={11} color="#10B981" />
                  <Text className="text-[10px] text-emerald-500 font-bold ml-1">
                    Plaid & Open Banking Standard
                  </Text>
                </View>
              </View>
            </View>

            <Pressable
              onPress={onClose}
              className="p-2 rounded-full bg-slate-500/10 active:opacity-60"
            >
              <X size={18} color={colors.muted} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} className="pb-4">
            {/* Sync Status Banner */}
            {syncResultBanner ? (
              <View className="p-3 mb-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/35 flex-row items-center justify-between">
                <View className="flex-row items-center flex-1 mr-2">
                  <CheckCircle2 size={16} color="#10B981" />
                  <Text className="text-xs text-emerald-400 font-bold ml-2 flex-1">
                    {syncResultBanner}
                  </Text>
                </View>
                <Pressable onPress={() => setSyncResultBanner(null)}>
                  <X size={14} color="#10B981" />
                </Pressable>
              </View>
            ) : null}

            {/* Sync All Button */}
            {accounts.length > 0 && (
              <View className="flex-row justify-between items-center mb-3">
                <Text style={{ color: colors.muted }} className="text-xs font-bold uppercase tracking-wider">
                  Connected Institutions ({accounts.length})
                </Text>
                <Pressable
                  onPress={() => handleSync()}
                  disabled={syncingAll}
                  className="py-1.5 px-3 rounded-xl bg-indigo-600 active:bg-indigo-700 flex-row items-center"
                >
                  {syncingAll ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <RefreshCw size={12} color="#FFFFFF" />
                      <Text className="text-white text-xs font-bold ml-1.5">Sync All</Text>
                    </>
                  )}
                </Pressable>
              </View>
            )}

            {/* Connected Accounts Cards */}
            {accounts.map((acc) => {
              const isSyncing = syncingId === acc.id || syncingAll;
              return (
                <View
                  key={acc.id}
                  style={{
                    backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
                  }}
                  className="p-4 rounded-2xl border mb-3 flex-row items-center justify-between shadow-sm"
                >
                  <View className="flex-row items-center flex-1 mr-3">
                    <View className="w-10 h-10 rounded-2xl bg-indigo-500/15 items-center justify-center mr-3">
                      <Building2 size={18} color="#6366F1" />
                    </View>
                    <View className="flex-1">
                      <Text style={{ color: colors.text }} className="text-sm font-bold" numberOfLines={1}>
                        {acc.institution_name}
                      </Text>
                      <View className="flex-row items-center space-x-1.5 mt-0.5">
                        <Text style={{ color: colors.muted }} className="text-[11px] font-medium">
                          {acc.account_type.toUpperCase()} ····{acc.account_mask || '4242'}
                        </Text>
                        <Text className="text-slate-400 text-[10px]">·</Text>
                        <Text style={{ color: '#10B981' }} className="text-[11px] font-bold">
                          {formatCurrency(acc.balance, currencySymbol)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View className="flex-row items-center space-x-2">
                    <Pressable
                      onPress={() => handleSync(acc)}
                      disabled={isSyncing}
                      style={{
                        backgroundColor: isDark ? 'rgba(99, 102, 241, 0.2)' : '#EEF2FF',
                      }}
                      className="p-2.5 rounded-xl mr-1.5 active:opacity-70"
                    >
                      {isSyncing ? (
                        <ActivityIndicator size="small" color="#6366F1" />
                      ) : (
                        <RefreshCw size={14} color="#6366F1" />
                      )}
                    </Pressable>

                    <Pressable
                      onPress={() => handleDisconnect(acc)}
                      className="p-2.5 rounded-xl bg-slate-700/20 active:opacity-70"
                    >
                      <Trash2 size={14} color={colors.muted} />
                    </Pressable>
                  </View>
                </View>
              );
            })}

            {/* Link New Institution Section */}
            <View className="mt-4 mb-2">
              <Text style={{ color: colors.muted }} className="text-xs font-bold uppercase tracking-wider mb-2.5">
                Link Another Bank or Card
              </Text>
              <View className="space-y-2">
                {AVAILABLE_BANKS.map((b) => {
                  const isAlreadyLinked = accounts.some(
                    (a) => a.institution_name.toLowerCase() === b.name.toLowerCase()
                  );
                  const isLinking = linkingBank === b.name;

                  return (
                    <Pressable
                      key={b.name}
                      onPress={() => !isAlreadyLinked && handleLink(b.name)}
                      disabled={isAlreadyLinked || isLinking}
                      style={{
                        backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                        borderColor: isAlreadyLinked
                          ? 'rgba(16, 185, 129, 0.3)'
                          : isDark
                          ? 'rgba(255, 255, 255, 0.08)'
                          : '#E2E8F0',
                        opacity: isAlreadyLinked ? 0.6 : 1,
                      }}
                      className="p-3.5 rounded-2xl border flex-row items-center justify-between mb-2 active:scale-[0.99]"
                    >
                      <View className="flex-row items-center flex-1 mr-3">
                        <View
                          style={{ backgroundColor: b.logoColor }}
                          className="w-8 h-8 rounded-xl items-center justify-center mr-2.5 shadow-sm"
                        >
                          <CreditCard size={15} color="#FFFFFF" />
                        </View>
                        <View className="flex-1">
                          <Text style={{ color: colors.text }} className="text-xs font-bold">
                            {b.name}
                          </Text>
                          <Text style={{ color: colors.muted }} className="text-[10px]">
                            {b.type.toUpperCase()} ····{b.mask}
                          </Text>
                        </View>
                      </View>

                      {isAlreadyLinked ? (
                        <View className="px-2.5 py-1 rounded-lg bg-emerald-500/20 flex-row items-center">
                          <CheckCircle2 size={11} color="#10B981" />
                          <Text className="text-emerald-400 text-[10px] font-bold ml-1">Linked</Text>
                        </View>
                      ) : isLinking ? (
                        <ActivityIndicator size="small" color="#6366F1" />
                      ) : (
                        <View className="px-2.5 py-1 rounded-lg bg-indigo-600/20 flex-row items-center">
                          <Plus size={11} color="#6366F1" />
                          <Text className="text-indigo-400 text-[10px] font-bold ml-1">Connect</Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
