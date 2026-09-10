import React from 'react';
import { View, Text } from 'react-native';
import { Repeat, TrendingDown, ShieldAlert } from 'lucide-react-native';
import { Subscription } from '@/types/subscription';
import { getMonthlyBurn } from '@/lib/subscriptions';
import { formatCurrency } from '@/lib/pennyAI';
import { useTheme } from '@/hooks/useTheme';

interface SubscriptionBurnSummaryProps {
  subscriptions: Subscription[];
  currency?: string;
}

export const SubscriptionBurnSummary: React.FC<SubscriptionBurnSummaryProps> = ({
  subscriptions,
  currency = 'USD',
}) => {
  const { isDark } = useTheme();

  const activeSubs = subscriptions.filter((s) => s.status === 'active');
  const monthlyBurn = getMonthlyBurn(subscriptions);
  const yearlyBurn = monthlyBurn * 12;
  const toCancelCount = subscriptions.filter((s) => s.status === 'to_cancel').length;

  return (
    <View
      style={{
        backgroundColor: isDark ? '#1E293B' : '#1E293B',
        borderColor: 'rgba(255, 255, 255, 0.08)',
      }}
      className="p-5 rounded-3xl border shadow-lg mb-4"
    >
      <View className="flex-row justify-between items-center mb-1">
        <Text className="text-[10px] font-bold uppercase tracking-widest text-indigo-300">
          Recurring Monthly Commitment
        </Text>
        <Repeat size={16} color="#818CF8" />
      </View>

      <Text className="text-3xl font-black text-white my-1">
        {formatCurrency(monthlyBurn, currency)}
        <Text className="text-sm font-semibold text-slate-400"> /mo</Text>
      </Text>

      <Text className="text-xs text-slate-300 mt-1">
        Across <Text className="font-bold text-white">{activeSubs.length} active</Text> subscription
        {activeSubs.length === 1 ? '' : 's'} (
        <Text className="font-bold text-rose-400">{formatCurrency(yearlyBurn, currency)}/year</Text>)
      </Text>

      {toCancelCount > 0 ? (
        <View className="flex-row items-center mt-3 pt-2.5 border-t border-slate-700/60">
          <ShieldAlert size={14} color="#F87171" />
          <Text className="text-xs font-semibold text-rose-300 ml-1.5">
            {toCancelCount} subscription{toCancelCount > 1 ? 's' : ''} marked for cancellation
          </Text>
        </View>
      ) : null}
    </View>
  );
};
