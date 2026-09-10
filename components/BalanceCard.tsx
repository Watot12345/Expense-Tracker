import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Wallet, Eye, EyeOff, ArrowDownLeft, ArrowUpRight, Plus, Download, Camera, Landmark } from 'lucide-react-native';
import { formatCurrency } from '@/lib/pennyAI';
import { useTheme } from '@/hooks/useTheme';

interface BalanceCardProps {
  balance: number;
  income: number;
  expense: number;
  currency?: string;
  onAddExpense: () => void;
  onAddIncome: () => void;
  onScanReceipt?: () => void;
  onOpenBankSync?: () => void;
  onExportCSV?: () => void;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({
  balance,
  income,
  expense,
  currency = 'USD',
  onAddExpense,
  onAddIncome,
  onScanReceipt,
  onOpenBankSync,
  onExportCSV,
}) => {
  const [isMasked, setIsMasked] = useState(false);
  const { isDark } = useTheme();

  return (
    <View className="rounded-[28px] overflow-hidden shadow-xl mb-5">
      <LinearGradient
        colors={isDark ? ['#1E293B', '#0F172A'] : ['#1E293B', '#111827']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="p-6 relative"
      >
        {/* Subtle decorative glow */}
        <View
          style={{
            position: 'absolute',
            top: -40,
            right: -40,
            width: 140,
            height: 140,
            borderRadius: 70,
            backgroundColor: 'rgba(99, 102, 241, 0.25)',
          }}
        />

        {/* Card Header: Label & Privacy Eye Toggle */}
        <View className="flex-row justify-between items-center mb-2">
          <View className="flex-row items-center space-x-2">
            <Wallet size={15} color="#94A3B8" />
            <Text className="text-xs uppercase tracking-widest font-semibold text-slate-400">
              Current Balance
            </Text>
          </View>
          <Pressable
            onPress={() => setIsMasked((prev) => !prev)}
            className="p-1.5 rounded-full bg-slate-800/80 active:opacity-70"
            hitSlop={8}
          >
            {isMasked ? <EyeOff size={16} color="#94A3B8" /> : <Eye size={16} color="#94A3B8" />}
          </Pressable>
        </View>

        {/* Balance Amount */}
        <Text className="text-4xl font-extrabold text-white tracking-tight my-1">
          {isMasked ? '••••••••' : formatCurrency(balance, currency)}
        </Text>

        {/* Cashflow Row */}
        <View className="flex-row justify-between items-center mt-4 pt-4 border-t border-slate-700/60">
          <View className="flex-row items-center space-x-2">
            <View className="w-8 h-8 rounded-full bg-emerald-500/20 items-center justify-center">
              <ArrowDownLeft size={16} color="#34D399" />
            </View>
            <View>
              <Text className="text-[11px] text-slate-400 font-medium">Income</Text>
              <Text className="text-sm font-bold text-emerald-400">
                {isMasked ? '••••' : formatCurrency(income, currency)}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center space-x-2">
            <View className="w-8 h-8 rounded-full bg-rose-500/20 items-center justify-center">
              <ArrowUpRight size={16} color="#FB7185" />
            </View>
            <View>
              <Text className="text-[11px] text-slate-400 font-medium">Expenses</Text>
              <Text className="text-sm font-bold text-rose-400">
                {isMasked ? '••••' : formatCurrency(expense, currency)}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Pills Row */}
        <View className="flex-row items-center space-x-2 mt-5">
          <Pressable
            onPress={onAddExpense}
            className="flex-1 flex-row items-center justify-center py-2.5 px-3 rounded-2xl bg-indigo-600 active:bg-indigo-700 shadow-md"
          >
            <Plus size={16} color="#FFFFFF" />
            <Text className="text-white text-xs font-bold ml-1">Expense</Text>
          </Pressable>

          <Pressable
            onPress={onAddIncome}
            className="flex-1 flex-row items-center justify-center py-2.5 px-3 rounded-2xl bg-slate-800/90 active:bg-slate-700 border border-slate-700/80"
          >
            <Plus size={16} color="#34D399" />
            <Text className="text-emerald-400 text-xs font-bold ml-1">Income</Text>
          </Pressable>

          {onScanReceipt ? (
            <Pressable
              onPress={onScanReceipt}
              accessibilityLabel="Scan receipt with AI"
              className="py-2.5 px-3 rounded-2xl bg-amber-500/20 active:bg-amber-500/30 border border-amber-500/40 items-center justify-center flex-row"
            >
              <Camera size={15} color="#F59E0B" />
              <Text className="text-amber-400 text-xs font-bold ml-1">Scan</Text>
            </Pressable>
          ) : null}

          {onOpenBankSync ? (
            <Pressable
              onPress={onOpenBankSync}
              accessibilityLabel="Sync bank and spending accounts"
              className="py-2.5 px-3 rounded-2xl bg-indigo-500/20 active:bg-indigo-500/30 border border-indigo-500/40 items-center justify-center flex-row"
            >
              <Landmark size={15} color="#818CF8" />
              <Text className="text-indigo-300 text-xs font-bold ml-1">Sync</Text>
            </Pressable>
          ) : null}

          {onExportCSV ? (
            <Pressable
              onPress={onExportCSV}
              className="py-2.5 px-3 rounded-2xl bg-slate-800/90 active:bg-slate-700 border border-slate-700/80 items-center justify-center"
            >
              <Download size={16} color="#94A3B8" />
            </Pressable>
          ) : null}
        </View>
      </LinearGradient>
    </View>
  );
};
