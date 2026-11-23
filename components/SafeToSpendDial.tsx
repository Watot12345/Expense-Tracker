import React, { useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView, StyleSheet } from 'react-native';
import { ShieldCheck, AlertTriangle, AlertCircle, X, Info, ChevronRight } from 'lucide-react-native';
import { SafeToSpendResult } from '@/lib/safeToSpend';
import { formatCurrency } from '@/lib/pennyAI';
import { useTheme } from '@/hooks/useTheme';
import { AnimatedProgressBar } from '@/components/AnimatedPrimitives';

interface SafeToSpendDialProps {
  data: SafeToSpendResult;
  currency?: string;
}

export const SafeToSpendDial: React.FC<SafeToSpendDialProps> = ({ data, currency = 'USD' }) => {
  const { colors, isDark } = useTheme();
  const [sheetVisible, setSheetVisible] = useState(false);

  const statusColor =
    data.status === 'overspent'
      ? '#F43F5E'
      : data.status === 'tight'
      ? '#F59E0B'
      : '#10B981';

  const statusBg =
    data.status === 'overspent'
      ? 'rgba(244, 63, 94, 0.14)'
      : data.status === 'tight'
      ? 'rgba(245, 158, 11, 0.14)'
      : 'rgba(16, 185, 129, 0.14)';

  const statusLabel =
    data.status === 'overspent'
      ? 'Over Limit'
      : data.status === 'tight'
      ? 'Watch Pace'
      : 'On Track';

  const remainingFraction =
    data.baseDailyAllowance > 0
      ? Math.max(0, Math.min(1, data.dailySafeToSpend / data.baseDailyAllowance))
      : 0;
  const remainingPercent = Math.round(remainingFraction * 100);

  return (
    <>
      <Pressable
        onPress={() => setSheetVisible(true)}
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        {/* Top Row: Status Badge + Breakdown Trigger */}
        <View style={styles.topRow}>
          <View style={styles.rowCenter}>
            <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
              {data.status === 'overspent' ? (
                <AlertCircle size={12} color={statusColor} />
              ) : data.status === 'tight' ? (
                <AlertTriangle size={12} color={statusColor} />
              ) : (
                <ShieldCheck size={12} color={statusColor} />
              )}
              <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                {statusLabel}
              </Text>
            </View>
            <Text style={[styles.titleLabel, { color: colors.muted }]}>
              DAILY SAFE SPEND
            </Text>
          </View>

          <View style={styles.rowCenter}>
            <Text style={[styles.percentText, { color: statusColor }]}>
              {remainingPercent}% left
            </Text>
            <ChevronRight size={14} color={colors.muted} style={{ marginLeft: 2 }} />
          </View>
        </View>

        {/* Middle Row: Big Amount & Today's Spend */}
        <View style={styles.amountRow}>
          {data.isZeroIncome ? (
            <Text style={[styles.zeroIncomeText, { color: colors.muted }]}>
              Add income to activate daily allowance
            </Text>
          ) : (
            <Text style={[styles.bigAmount, { color: colors.text }]}>
              {data.dailySafeToSpend < 0 ? '-' : ''}
              {formatCurrency(Math.abs(data.dailySafeToSpend), currency)}
            </Text>
          )}

          <Text style={[styles.spentTodayText, { color: colors.muted }]}>
            {data.todaySpendSoFar > 0
              ? `${formatCurrency(data.todaySpendSoFar, currency)} spent today`
              : `of ${formatCurrency(data.baseDailyAllowance, currency)}/day`}
          </Text>
        </View>

        {/* Horizontal Progress Bar (No Circles) */}
        <AnimatedProgressBar
          progress={remainingPercent}
          color={statusColor}
          trackColor={isDark ? 'rgba(148, 163, 184, 0.16)' : '#E2E8F0'}
          height={8}
        />
      </Pressable>

      {/* Breakdown Sheet Modal */}
      <Modal
        visible={sheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSheetVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View
            style={{
              backgroundColor: isDark ? '#101726' : '#FFFFFF',
              borderTopColor: colors.border,
            }}
            className="p-6 rounded-t-[32px] border-t max-h-[85%]"
          >
            {/* Modal Header */}
            <View className="flex-row justify-between items-center mb-5">
              <View className="flex-row items-center">
                <View className="w-9 h-9 rounded-2xl bg-indigo-500/15 items-center justify-center mr-2.5">
                  <Info size={17} color="#6366F1" />
                </View>
                <Text style={{ color: colors.text }} className="text-lg font-extrabold tracking-tight">
                  Safe-to-Spend Breakdown
                </Text>
              </View>
              <Pressable
                onPress={() => setSheetVisible(false)}
                className="p-2 rounded-xl bg-slate-500/15"
              >
                <X size={18} color={colors.muted} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Step 1: Discretionary Income */}
              <View
                style={{
                  backgroundColor: isDark ? '#162033' : '#F8FAFC',
                  borderColor: colors.border,
                }}
                className="p-4 rounded-2xl border mb-3"
              >
                <Text className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-400 mb-2">
                  1. Monthly Discretionary Pool
                </Text>
                <View className="flex-row justify-between py-1.5 border-b border-slate-500/15">
                  <Text style={{ color: colors.muted }} className="text-xs">Monthly Income</Text>
                  <Text style={{ color: colors.text }} className="text-xs font-bold">
                    +{formatCurrency(data.monthlyIncome, currency)}
                  </Text>
                </View>
                <View className="flex-row justify-between py-1.5 border-b border-slate-500/15">
                  <Text style={{ color: colors.muted }} className="text-xs">Fixed Subscriptions</Text>
                  <Text className="text-xs font-bold text-rose-400">
                    -{formatCurrency(data.monthlySubscriptionBurn, currency)}
                  </Text>
                </View>
                <View className="flex-row justify-between py-1.5 border-b border-slate-500/15">
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
                  backgroundColor: isDark ? '#162033' : '#F8FAFC',
                  borderColor: colors.border,
                }}
                className="p-4 rounded-2xl border mb-3"
              >
                <Text className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-400 mb-2">
                  2. Daily Allocation
                </Text>
                <View className="flex-row justify-between py-1.5 border-b border-slate-500/15">
                  <Text style={{ color: colors.muted }} className="text-xs">Discretionary Pool</Text>
                  <Text style={{ color: colors.text }} className="text-xs font-bold">
                    {formatCurrency(data.discretionaryIncome, currency)}
                  </Text>
                </View>
                <View className="flex-row justify-between py-1.5 border-b border-slate-500/15">
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
                  backgroundColor: isDark ? '#162033' : '#F8FAFC',
                  borderColor: colors.border,
                }}
                className="p-4 rounded-2xl border mb-5"
              >
                <Text className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-400 mb-2">
                  3. Today's Available Balance
                </Text>
                <View className="flex-row justify-between py-1.5 border-b border-slate-500/15">
                  <Text style={{ color: colors.muted }} className="text-xs">Base Daily Budget</Text>
                  <Text style={{ color: colors.text }} className="text-xs font-bold">
                    {formatCurrency(data.baseDailyAllowance, currency)}
                  </Text>
                </View>
                <View className="flex-row justify-between py-1.5 border-b border-slate-500/15">
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
                className="py-3.5 rounded-2xl bg-indigo-600 items-center justify-center mb-4"
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

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginRight: 8,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginLeft: 4,
    letterSpacing: 0.4,
  },
  titleLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.7,
  },
  percentText: {
    fontSize: 11,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  bigAmount: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.6,
    fontVariant: ['tabular-nums'],
  },
  zeroIncomeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  spentTodayText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
