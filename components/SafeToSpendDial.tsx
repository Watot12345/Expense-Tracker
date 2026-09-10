import React, { useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { ShieldCheck, AlertTriangle, AlertCircle, X, Info, ArrowRight } from 'lucide-react-native';
import { SafeToSpendResult } from '@/lib/safeToSpend';
import { formatCurrency } from '@/lib/pennyAI';
import { useTheme } from '@/hooks/useTheme';

interface SafeToSpendDialProps {
  data: SafeToSpendResult;
  currency?: string;
}

export const SafeToSpendDial: React.FC<SafeToSpendDialProps> = ({ data, currency = 'USD' }) => {
  const { colors, isDark } = useTheme();
  const [sheetVisible, setSheetVisible] = useState(false);

  // Status color
  const statusColor =
    data.status === 'overspent'
      ? '#EF4444'
      : data.status === 'tight'
      ? '#F59E0B'
      : '#10B981';

  // SVG circular arc math
  const size = 100;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Percentage of daily allowance remaining (bounded 0 to 100)
  const remainingFraction =
    data.baseDailyAllowance > 0
      ? Math.max(0, Math.min(1, data.dailySafeToSpend / data.baseDailyAllowance))
      : 0;
  const strokeDashoffset = circumference * (1 - remainingFraction);

  return (
    <>
      <Pressable
        onPress={() => setSheetVisible(true)}
        style={{
          backgroundColor: isDark ? 'rgba(30, 41, 59, 0.5)' : '#FFFFFF',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(226, 232, 240, 0.9)',
        }}
        className="p-4 mb-4 rounded-3xl border shadow-sm flex-row items-center justify-between active:opacity-80"
      >
        {/* Left: Info & Big Amount */}
        <View className="flex-1 mr-3">
          <View className="flex-row items-center space-x-1.5 mb-1">
            {data.status === 'overspent' ? (
              <AlertCircle size={14} color="#EF4444" />
            ) : data.status === 'tight' ? (
              <AlertTriangle size={14} color="#F59E0B" />
            ) : (
              <ShieldCheck size={14} color="#10B981" />
            )}
            <Text className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Safe to Spend Today
            </Text>
          </View>

          {data.isZeroIncome ? (
            <Text style={{ color: colors.muted }} className="text-sm font-semibold mt-1">
              Add income to activate allowance
            </Text>
          ) : (
            <Text
              style={{ color: statusColor }}
              className="text-3xl font-black tracking-tight"
            >
              {data.dailySafeToSpend < 0 ? '-' : ''}
              {formatCurrency(Math.abs(data.dailySafeToSpend), currency)}
            </Text>
          )}

          <Text style={{ color: colors.muted }} className="text-[11px] mt-0.5">
            {data.todaySpendSoFar > 0
              ? `${formatCurrency(data.todaySpendSoFar, currency)} spent today · Tap for breakdown`
              : 'Tap to see daily budget breakdown'}
          </Text>
        </View>

        {/* Right: Circular Gauge */}
        <View className="items-center justify-center relative">
          <Svg width={size} height={size}>
            {/* Background track circle */}
            <Circle
              stroke={isDark ? 'rgba(51, 65, 85, 0.4)' : '#E2E8F0'}
              fill="none"
              cx={size / 2}
              cy={size / 2}
              r={radius}
              strokeWidth={strokeWidth}
            />
            {/* Active progress arc */}
            <Circle
              stroke={statusColor}
              fill="none"
              cx={size / 2}
              cy={size / 2}
              r={radius}
              strokeWidth={strokeWidth}
              strokeDasharray={`${circumference} ${circumference}`}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          </Svg>
          <View className="absolute inset-0 items-center justify-center">
            <Text style={{ color: colors.text }} className="text-xs font-bold">
              {Math.round(remainingFraction * 100)}%
            </Text>
          </View>
        </View>
      </Pressable>

      {/* Breakdown Sheet Modal */}
      <Modal visible={sheetVisible} transparent animationType="slide" onRequestClose={() => setSheetVisible(false)}>
        <View className="flex-1 justify-end bg-black/60">
          <View
            style={{
              backgroundColor: isDark ? '#111827' : '#FFFFFF',
              borderTopColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E2E8F0',
            }}
            className="p-6 rounded-t-[36px] border-t max-h-[85%]"
          >
            {/* Modal Header */}
            <View className="flex-row justify-between items-center mb-5">
              <View className="flex-row items-center space-x-2">
                <View className="w-8 h-8 rounded-xl bg-indigo-500/20 items-center justify-center mr-2">
                  <Info size={16} color="#6366F1" />
                </View>
                <Text style={{ color: colors.text }} className="text-xl font-bold">
                  Safe-to-Spend Breakdown
                </Text>
              </View>
              <Pressable onPress={() => setSheetVisible(false)} className="p-2 rounded-full bg-slate-800/20">
                <X size={18} color={colors.muted} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Step 1: Discretionary Income */}
              <View
                style={{
                  backgroundColor: isDark ? 'rgba(30, 41, 59, 0.5)' : '#F8FAFC',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
                }}
                className="p-4 rounded-2xl border mb-3"
              >
                <Text className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2">
                  1. Monthly Discretionary Pool
                </Text>
                <View className="flex-row justify-between py-1 border-b border-slate-700/20">
                  <Text style={{ color: colors.muted }} className="text-xs">Monthly Income</Text>
                  <Text style={{ color: colors.text }} className="text-xs font-bold">
                    +{formatCurrency(data.monthlyIncome, currency)}
                  </Text>
                </View>
                <View className="flex-row justify-between py-1 border-b border-slate-700/20">
                  <Text style={{ color: colors.muted }} className="text-xs">Fixed Subscriptions</Text>
                  <Text className="text-xs font-bold text-rose-400">
                    -{formatCurrency(data.monthlySubscriptionBurn, currency)}
                  </Text>
                </View>
                <View className="flex-row justify-between py-1 border-b border-slate-700/20">
                  <Text style={{ color: colors.muted }} className="text-xs">Savings Goals Target</Text>
                  <Text className="text-xs font-bold text-indigo-400">
                    -{formatCurrency(data.monthlySavingsGoalTarget, currency)}
                  </Text>
                </View>
                <View className="flex-row justify-between pt-2">
                  <Text style={{ color: colors.text }} className="text-xs font-extrabold">= Discretionary Pool</Text>
                  <Text style={{ color: colors.text }} className="text-xs font-extrabold">
                    {formatCurrency(data.discretionaryIncome, currency)}
                  </Text>
                </View>
              </View>

              {/* Step 2: Daily Allowance */}
              <View
                style={{
                  backgroundColor: isDark ? 'rgba(30, 41, 59, 0.5)' : '#F8FAFC',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
                }}
                className="p-4 rounded-2xl border mb-3"
              >
                <Text className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2">
                  2. Daily Allocation
                </Text>
                <View className="flex-row justify-between py-1 border-b border-slate-700/20">
                  <Text style={{ color: colors.muted }} className="text-xs">Discretionary Pool</Text>
                  <Text style={{ color: colors.text }} className="text-xs font-bold">
                    {formatCurrency(data.discretionaryIncome, currency)}
                  </Text>
                </View>
                <View className="flex-row justify-between py-1 border-b border-slate-700/20">
                  <Text style={{ color: colors.muted }} className="text-xs">Days Left in Month</Text>
                  <Text style={{ color: colors.text }} className="text-xs font-bold">
                    ÷ {data.daysRemainingInMonth} days
                  </Text>
                </View>
                <View className="flex-row justify-between pt-2">
                  <Text style={{ color: colors.text }} className="text-xs font-extrabold">= Base Daily Budget</Text>
                  <Text style={{ color: colors.text }} className="text-xs font-extrabold">
                    {formatCurrency(data.baseDailyAllowance, currency)} /day
                  </Text>
                </View>
              </View>

              {/* Step 3: Today's Remaining */}
              <View
                style={{
                  backgroundColor: isDark ? 'rgba(30, 41, 59, 0.5)' : '#F8FAFC',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
                }}
                className="p-4 rounded-2xl border mb-5"
              >
                <Text className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2">
                  3. Today's Available Balance
                </Text>
                <View className="flex-row justify-between py-1 border-b border-slate-700/20">
                  <Text style={{ color: colors.muted }} className="text-xs">Base Daily Budget</Text>
                  <Text style={{ color: colors.text }} className="text-xs font-bold">
                    {formatCurrency(data.baseDailyAllowance, currency)}
                  </Text>
                </View>
                <View className="flex-row justify-between py-1 border-b border-slate-700/20">
                  <Text style={{ color: colors.muted }} className="text-xs">Today's Logged Spend</Text>
                  <Text className="text-xs font-bold text-rose-400">
                    -{formatCurrency(data.todaySpendSoFar, currency)}
                  </Text>
                </View>
                <View className="flex-row justify-between pt-2">
                  <Text style={{ color: colors.text }} className="text-sm font-extrabold">
                    = Safe to Spend Today
                  </Text>
                  <Text style={{ color: statusColor }} className="text-sm font-black">
                    {data.dailySafeToSpend < 0 ? '-' : ''}
                    {formatCurrency(Math.abs(data.dailySafeToSpend), currency)}
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={() => setSheetVisible(false)}
                className="py-3.5 rounded-2xl bg-indigo-600 active:bg-indigo-700 items-center justify-center shadow-lg mb-4"
              >
                <Text className="text-white font-bold text-sm">Got it</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
};
