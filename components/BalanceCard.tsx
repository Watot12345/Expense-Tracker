import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Wallet,
  Eye,
  EyeOff,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Download,
  Camera,
  Landmark,
} from 'lucide-react-native';
import { formatCurrency } from '@/lib/pennyAI';
import { useTheme } from '@/hooks/useTheme';
import { AnimatedProgressBar } from '@/components/AnimatedPrimitives';

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

  const spendRatio = income > 0 ? Math.min(100, Math.round((expense / income) * 100)) : 0;
  const savingsRate = income > 0 ? Math.max(0, Math.round(((income - expense) / income) * 100)) : 0;

  return (
    <View
      style={[
        styles.outerCard,
        {
          shadowColor: isDark ? '#000000' : '#0F172A',
          shadowOpacity: isDark ? 0.4 : 0.16,
        },
      ]}
    >
      <LinearGradient
        colors={isDark ? ['#162033', '#0F172A'] : ['#1E293B', '#0F172A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientInner}
      >
        {/* Header: Label, Savings Rate Pill & Privacy Toggle */}
        <View style={styles.headerRow}>
          <View style={styles.rowCenter}>
            <View style={styles.walletIconBox}>
              <Wallet size={14} color="#A5B4FC" />
            </View>
            <Text style={styles.headerLabel}>NET BALANCE</Text>
          </View>

          <View style={styles.rowCenter}>
            {income > 0 && !isMasked ? (
              <View style={styles.savedPill}>
                <Text style={styles.savedPillText}>{savingsRate}% SAVED</Text>
              </View>
            ) : null}

            <Pressable
              onPress={() => setIsMasked((prev) => !prev)}
              style={styles.eyeBtn}
              hitSlop={8}
              accessibilityLabel={isMasked ? 'Show balance' : 'Hide balance'}
            >
              {isMasked ? (
                <EyeOff size={15} color="#CBD5E1" />
              ) : (
                <Eye size={15} color="#CBD5E1" />
              )}
            </Pressable>
          </View>
        </View>

        {/* Balance Amount */}
        <Text style={styles.balanceText}>
          {isMasked ? '••••••••' : formatCurrency(balance, currency)}
        </Text>

        {/* Cashflow Utilization Micro-Bar */}
        {income > 0 ? (
          <View style={{ marginTop: 8, marginBottom: 4 }}>
            <AnimatedProgressBar
              progress={spendRatio}
              color={spendRatio > 85 ? '#FB7185' : spendRatio > 65 ? '#FBBF24' : '#34D399'}
              trackColor="rgba(255, 255, 255, 0.12)"
              height={5}
            />
          </View>
        ) : null}

        {/* Cashflow Row */}
        <View style={styles.cashflowRow}>
          <View style={styles.rowCenter}>
            <View style={styles.incomeIconBox}>
              <ArrowDownLeft size={16} color="#34D399" />
            </View>
            <View>
              <Text style={styles.cashflowCaption}>INCOME</Text>
              <Text style={styles.incomeValue}>
                {isMasked ? '••••' : formatCurrency(income, currency)}
              </Text>
            </View>
          </View>

          <View style={styles.rowCenter}>
            <View style={styles.expenseIconBox}>
              <ArrowUpRight size={16} color="#FB7185" />
            </View>
            <View>
              <Text style={styles.cashflowCaption}>EXPENSES</Text>
              <Text style={styles.expenseValue}>
                {isMasked ? '••••' : formatCurrency(expense, currency)}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons Row */}
        <View style={styles.actionsRow}>
          <Pressable onPress={onAddExpense} style={styles.primaryActionBtn}>
            <Plus size={15} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={styles.primaryActionText}>Expense</Text>
          </Pressable>

          <Pressable onPress={onAddIncome} style={styles.secondaryActionBtn}>
            <Plus size={15} color="#34D399" strokeWidth={2.5} />
            <Text style={styles.secondaryActionText}>Income</Text>
          </Pressable>

          {onScanReceipt ? (
            <Pressable
              onPress={onScanReceipt}
              accessibilityLabel="Scan receipt with AI"
              style={styles.iconActionBtnAmber}
            >
              <Camera size={15} color="#FBBF24" />
            </Pressable>
          ) : null}

          {onOpenBankSync ? (
            <Pressable
              onPress={onOpenBankSync}
              accessibilityLabel="Sync bank and spending accounts"
              style={styles.iconActionBtnIndigo}
            >
              <Landmark size={15} color="#A5B4FC" />
            </Pressable>
          ) : null}

          {onExportCSV ? (
            <Pressable
              onPress={onExportCSV}
              accessibilityLabel="Export transactions to CSV"
              style={styles.iconActionBtnNeutral}
            >
              <Download size={15} color="#CBD5E1" />
            </Pressable>
          ) : null}
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  outerCard: {
    borderRadius: 26,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
    marginBottom: 16,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 6,
  },
  gradientInner: {
    padding: 22,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletIconBox: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    color: '#CBD5E1',
  },
  savedPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.28)',
    marginRight: 8,
  },
  savedPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6EE7B7',
  },
  eyeBtn: {
    padding: 7,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  balanceText: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.8,
    marginVertical: 4,
    fontVariant: ['tabular-nums'],
  },
  cashflowRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  incomeIconBox: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  expenseIconBox: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(251, 113, 133, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cashflowCaption: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  incomeValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#34D399',
    fontVariant: ['tabular-nums'],
  },
  expenseValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FB7185',
    fontVariant: ['tabular-nums'],
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    gap: 8,
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#6366F1',
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 5,
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  secondaryActionText: {
    color: '#6EE7B7',
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 5,
  },
  iconActionBtnAmber: {
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconActionBtnIndigo: {
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(99, 102, 241, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(165, 180, 252, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconActionBtnNeutral: {
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
