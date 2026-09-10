import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { BellRing, Calendar, CheckCircle2 } from 'lucide-react-native';
import { Subscription } from '@/types/subscription';
import { getUpcomingRenewals } from '@/lib/subscriptions';
import { formatCurrency } from '@/lib/pennyAI';
import { useTheme } from '@/hooks/useTheme';

interface RenewalRadarProps {
  subscriptions: Subscription[];
  currency?: string;
  onMarkPaid: (subscription: Subscription) => void;
}

export const RenewalRadar: React.FC<RenewalRadarProps> = ({
  subscriptions,
  currency = 'USD',
  onMarkPaid,
}) => {
  const { colors, isDark } = useTheme();
  const upcoming = getUpcomingRenewals(subscriptions, 7);

  if (upcoming.length === 0) {
    return null;
  }

  const getDaysText = (dateString: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateString);
    target.setHours(0, 0, 0, 0);
    const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    return `In ${diff}d`;
  };

  return (
    <View className="mb-5">
      <View className="flex-row items-center space-x-1.5 mb-2.5">
        <BellRing size={16} color="#6366F1" />
        <Text style={{ color: colors.text }} className="text-sm font-bold tracking-tight ml-1">
          Renewal Radar (Next 7 Days)
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-3">
        {upcoming.map((sub) => {
          const daysText = getDaysText(sub.next_billing_date);
          const isUrgent = daysText === 'Today' || daysText === 'Tomorrow';

          return (
            <View
              key={sub.id}
              style={{
                backgroundColor: isDark ? 'rgba(30, 41, 59, 0.6)' : '#FFFFFF',
                borderColor: isUrgent
                  ? '#EF4444'
                  : isDark
                  ? 'rgba(255, 255, 255, 0.08)'
                  : 'rgba(226, 232, 240, 0.9)',
                width: 170,
              }}
              className="p-3.5 rounded-2xl border shadow-sm mr-2.5"
            >
              <View className="flex-row justify-between items-center mb-1.5">
                <View
                  style={{
                    backgroundColor: isUrgent ? 'rgba(239, 68, 68, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                  }}
                  className="px-2 py-0.5 rounded-full"
                >
                  <Text
                    style={{ color: isUrgent ? '#EF4444' : '#6366F1' }}
                    className="text-[10px] font-bold"
                  >
                    {daysText}
                  </Text>
                </View>

                <Text style={{ color: colors.text }} className="text-xs font-black">
                  {formatCurrency(sub.amount, currency)}
                </Text>
              </View>

              <Text numberOfLines={1} style={{ color: colors.text }} className="text-sm font-bold mt-1">
                {sub.name}
              </Text>

              <Pressable
                onPress={() => onMarkPaid(sub)}
                className="mt-3 py-1.5 rounded-xl bg-indigo-600 active:bg-indigo-700 flex-row items-center justify-center space-x-1"
              >
                <CheckCircle2 size={12} color="#FFFFFF" />
                <Text className="text-white text-[10px] font-bold ml-1">Mark Paid</Text>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};
