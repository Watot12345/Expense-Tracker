import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TrendingUp, ShieldAlert, Sparkles, PieChart as PieIcon, Calendar, ArrowUpRight, ChevronRight } from 'lucide-react-native';
import { useSupabase } from '@/hooks/useSupabase';
import { useTheme } from '@/hooks/useTheme';
import { GlassCard } from '@/components/GlassCard';
import { formatCurrency, CATEGORY_META } from '@/lib/pennyAI';
import { AIFinancialCoachSheet } from '@/components/AIFinancialCoachSheet';

export default function StatsScreen() {
  const { colors, isDark } = useTheme();
  const { expenses, profile, incomeTotal, monthlySubscriptionBurn, financialHealth } = useSupabase();
  const [coachVisible, setCoachVisible] = useState(false);

  const currency = profile?.currency || 'USD';
  const monthlyBudget = profile?.monthly_budget || 1000;

  // Aggregate Category Totals
  const { categoryTotals, totalSpent, topCategory, avgDailySpend } = useMemo(() => {
    const totals: Record<string, number> = {};
    let sum = 0;
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Filter current month expenses
    const thisMonthExpenses = expenses.filter((e) => {
      const d = new Date(e.expense_date || e.created_at || '');
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    thisMonthExpenses.forEach((exp) => {
      const cat = exp.categories?.name || 'Other';
      totals[cat] = (totals[cat] || 0) + exp.amount;
      sum += exp.amount;
    });

    let topCatName = 'None';
    let topCatMax = 0;
    Object.entries(totals).forEach(([cat, val]) => {
      if (val > topCatMax) {
        topCatMax = val;
        topCatName = cat;
      }
    });

    const activeDays = Math.max(1, now.getDate());
    const avg = sum / activeDays;

    return {
      categoryTotals: totals,
      totalSpent: sum,
      topCategory: { name: topCatName, amount: topCatMax },
      avgDailySpend: avg,
    };
  }, [expenses]);

  const budgetRemaining = Math.max(0, monthlyBudget - totalSpent);
  const budgetBurnPercent = Math.min(100, Math.round((totalSpent / Math.max(1, monthlyBudget)) * 100));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'left', 'right']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
      >
        {/* Header */}
        <View className="mt-2 mb-5">
          <Text style={{ color: colors.text }} className="text-2xl font-black tracking-tight">
            Analytics & Insights 📊
          </Text>
          <Text style={{ color: colors.muted }} className="text-xs font-medium mt-0.5">
            Real-time breakdown of your spending habits
          </Text>
        </View>

        {/* Top 2 KPI Cards */}
        <View className="flex-row space-x-3 mb-4">
          {/* Card 1: Spent This Month */}
          <View
            style={{
              backgroundColor: isDark ? '#1E293B' : '#1E293B',
              borderColor: 'rgba(255, 255, 255, 0.08)',
            }}
            className="flex-1 p-4 rounded-3xl border shadow-md"
          >
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-[10px] font-bold uppercase tracking-wider text-indigo-200">
                This Month
              </Text>
              <TrendingUp size={16} color="#818CF8" />
            </View>
            <Text className="text-2xl font-black text-white">
              {formatCurrency(totalSpent, currency)}
            </Text>
            <Text className="text-[10px] text-indigo-300 font-medium mt-1">
              Active days: {new Date().getDate()}
            </Text>
          </View>

          {/* Card 2: Remaining Budget */}
          <View
            style={{
              backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5',
              borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : '#A7F3D0',
            }}
            className="flex-1 p-4 rounded-3xl border shadow-sm"
          >
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                Remaining
              </Text>
              <Calendar size={16} color="#10B981" />
            </View>
            <Text className="text-2xl font-black text-emerald-700">
              {formatCurrency(budgetRemaining, currency)}
            </Text>
            <Text className="text-[10px] text-emerald-600 font-medium mt-1">
              Limit: {formatCurrency(monthlyBudget, currency)}
            </Text>
          </View>
        </View>

        {/* Budget Burn Meter */}
        <GlassCard className="mb-4">
          <View className="flex-row justify-between items-center mb-2">
            <Text style={{ color: colors.text }} className="text-sm font-bold">
              Monthly Budget Burn
            </Text>
            <Text
              style={{
                color: budgetBurnPercent > 90 ? '#EF4444' : budgetBurnPercent > 70 ? '#F59E0B' : '#10B981',
              }}
              className="text-xs font-bold"
            >
              {budgetBurnPercent}% Spent
            </Text>
          </View>

          <View className="w-full h-3 rounded-full bg-slate-700/20 overflow-hidden my-2">
            <View
              style={{
                width: `${budgetBurnPercent}%`,
                backgroundColor:
                  budgetBurnPercent > 90 ? '#EF4444' : budgetBurnPercent > 70 ? '#F59E0B' : '#6366F1',
              }}
              className="h-full rounded-full"
            />
          </View>

          <View className="flex-row justify-between mt-1">
            <Text style={{ color: colors.muted }} className="text-[11px]">
              {formatCurrency(totalSpent, currency)} spent
            </Text>
            <Text style={{ color: colors.muted }} className="text-[11px]">
              {formatCurrency(monthlyBudget, currency)} target
            </Text>
          </View>
        </GlassCard>

        {/* 2 Micro KPI Cards */}
        <View className="flex-row space-x-3 mb-4">
          <GlassCard className="flex-1">
            <Text style={{ color: colors.muted }} className="text-[10px] font-bold uppercase tracking-wider mb-1">
              Avg Daily Spend
            </Text>
            <Text style={{ color: colors.text }} className="text-lg font-extrabold">
              {formatCurrency(avgDailySpend, currency)}
            </Text>
            <Text style={{ color: colors.muted }} className="text-[10px] mt-0.5">
              per active day
            </Text>
          </GlassCard>

          <GlassCard className="flex-1">
            <Text style={{ color: colors.muted }} className="text-[10px] font-bold uppercase tracking-wider mb-1">
              Top Category
            </Text>
            <Text numberOfLines={1} style={{ color: colors.text }} className="text-lg font-extrabold">
              {topCategory.name}
            </Text>
            <Text style={{ color: colors.muted }} className="text-[10px] mt-0.5">
              {formatCurrency(topCategory.amount, currency)}
            </Text>
          </GlassCard>
        </View>

        {/* Category Spending Breakdown */}
        <GlassCard className="mb-4">
          <View className="flex-row items-center space-x-2 mb-4">
            <PieIcon size={18} color="#6366F1" />
            <Text style={{ color: colors.text }} className="text-sm font-bold">
              Spending by Category
            </Text>
          </View>

          {Object.keys(categoryTotals).length === 0 ? (
            <Text style={{ color: colors.muted }} className="text-xs text-center py-4">
              No transactions recorded this month
            </Text>
          ) : (
            Object.entries(categoryTotals)
              .sort(([, a], [, b]) => b - a)
              .map(([category, amount]) => {
                const percent = totalSpent > 0 ? Math.round((amount / totalSpent) * 100) : 0;
                const meta = CATEGORY_META[category] || CATEGORY_META.Other;
                return (
                  <View key={category} className="mb-3">
                    <View className="flex-row justify-between items-center mb-1.5">
                      <View className="flex-row items-center space-x-2">
                        <View
                          style={{ backgroundColor: meta.color }}
                          className="w-2.5 h-2.5 rounded-full mr-1.5"
                        />
                        <Text style={{ color: colors.text }} className="text-xs font-semibold">
                          {category}
                        </Text>
                      </View>
                      <Text style={{ color: colors.text }} className="text-xs font-bold">
                        {formatCurrency(amount, currency)} ({percent}%)
                      </Text>
                    </View>
                    <View className="w-full h-2 rounded-full bg-slate-700/20 overflow-hidden">
                      <View
                        style={{ width: `${percent}%`, backgroundColor: meta.color }}
                        className="h-full rounded-full"
                      />
                    </View>
                  </View>
                );
              })
          )}
        </GlassCard>

        {/* AI Smart Insights */}
        <View
          style={{
            backgroundColor: isDark ? 'rgba(99, 102, 241, 0.12)' : '#EEF2FF',
            borderColor: isDark ? 'rgba(99, 102, 241, 0.3)' : '#C7D2FE',
          }}
          className="p-5 rounded-3xl border mb-6"
        >
          <View className="flex-row items-center space-x-2 mb-3">
            <Sparkles size={18} color="#6366F1" />
            <Text style={{ color: colors.text }} className="text-sm font-bold">
              PennyAI Smart Insights
            </Text>
          </View>
          <View className="space-y-2">
            <Text style={{ color: colors.text }} className="text-xs font-medium leading-relaxed">
              💡 {topCategory.name !== 'None'
                ? `Your highest expenditure this month is in "${topCategory.name}" (${formatCurrency(
                    topCategory.amount,
                    currency
                  )}). Consider setting a dedicated sub-budget.`
                : 'Log a few more expenses to receive personalized spending recommendations.'}
            </Text>
            {budgetBurnPercent > 80 ? (
              <Text className="text-xs font-medium text-rose-500 mt-1">
                ⚠️ You have consumed over 80% of your monthly budget with {30 - new Date().getDate()} days remaining.
              </Text>
            ) : (
              <Text className="text-xs font-medium text-emerald-500 mt-1">
                ✨ Your spending velocity is within healthy targets this month!
              </Text>
            )}
          </View>
        </View>

        {/* Floating AI Financial Advisor Launcher Card */}
        <Pressable
          onPress={() => setCoachVisible(true)}
          style={{
            backgroundColor: isDark ? 'rgba(99, 102, 241, 0.18)' : '#EEF2FF',
            borderColor: isDark ? 'rgba(99, 102, 241, 0.4)' : '#C7D2FE',
          }}
          className="p-5 rounded-3xl border mb-6 flex-row items-center justify-between active:scale-[0.99]"
        >
          <View className="flex-row items-center flex-1 mr-3">
            <View className="w-11 h-11 rounded-2xl bg-indigo-600 items-center justify-center mr-3 shadow-md shadow-indigo-500/30">
              <Sparkles size={20} color="#FFFFFF" />
            </View>
            <View className="flex-1">
              <Text style={{ color: colors.text }} className="text-sm font-black">
                Ask AI Financial Coach
              </Text>
              <Text style={{ color: colors.muted }} className="text-xs font-medium mt-0.5">
                Audit planned purchases with server guardrail math
              </Text>
            </View>
          </View>
          <View className="w-8 h-8 rounded-full bg-indigo-500/20 items-center justify-center">
            <ChevronRight size={16} color="#6366F1" />
          </View>
        </Pressable>
      </ScrollView>

      {/* AI Financial Coach Modal Sheet */}
      <AIFinancialCoachSheet
        visible={coachVisible}
        onClose={() => setCoachVisible(false)}
        currencySymbol={currency === 'USD' ? '$' : currency}
        context={{
          balance: financialHealth?.balance ?? Math.max(0, incomeTotal - totalSpent),
          income: financialHealth?.monthly_income ?? incomeTotal,
          subBurn: financialHealth?.monthly_subscription_burn ?? monthlySubscriptionBurn,
          todaySpent: financialHealth?.today_spent ?? avgDailySpend,
        }}
      />
    </SafeAreaView>
  );
}
