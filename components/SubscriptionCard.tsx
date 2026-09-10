import React from 'react';
import { View, Text, Pressable, Linking } from 'react-native';
import { Calendar, Trash2, Repeat, CheckCircle2, AlertTriangle, Mail } from 'lucide-react-native';
import { Subscription } from '@/types/subscription';
import { formatCurrency } from '@/lib/pennyAI';
import { useTheme } from '@/hooks/useTheme';

interface SubscriptionCardProps {
  subscription: Subscription;
  currency?: string;
  onToggleStatus: (id: string, status: 'active' | 'paused' | 'to_cancel') => void;
  onDelete: (id: string) => void;
  onMarkPaid?: (subscription: Subscription) => void;
}

export const SubscriptionCard: React.FC<SubscriptionCardProps> = ({
  subscription,
  currency = 'USD',
  onToggleStatus,
  onDelete,
  onMarkPaid,
}) => {
  const { colors, isDark } = useTheme();

  // Days until next renewal
  const nextDate = new Date(subscription.next_billing_date);
  const now = new Date();
  const diffDays = Math.ceil((nextDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  const renewalText = diffDays < 0
    ? 'Expired'
    : diffDays === 0
    ? 'Renews today'
    : diffDays === 1
    ? 'Renews tomorrow'
    : `Renews in ${diffDays} days`;

  const isUrgent = diffDays >= 0 && diffDays <= 3 && subscription.status === 'active';

  // Price creep detection
  const hasPriceCreep =
    subscription.previous_amount !== undefined &&
    subscription.previous_amount !== null &&
    subscription.previous_amount !== subscription.amount;
  const priceDiff = hasPriceCreep ? subscription.amount - (subscription.previous_amount || 0) : 0;

  // Zombie detector: active and untouched for 60+ days
  const lastChange = subscription.last_status_change_at
    ? new Date(subscription.last_status_change_at).getTime()
    : 0;
  const sixtyDaysAgo = Date.now() - 60 * 86400000;
  const isZombie = subscription.status === 'active' && lastChange > 0 && lastChange < sixtyDaysAgo;

  const handleGenerateCancelEmail = () => {
    const subject = encodeURIComponent(`Cancellation Request: Subscription for ${subscription.name}`);
    const body = encodeURIComponent(
      `Dear ${subscription.name} Support Team,\n\nI am writing to formally request the immediate cancellation of my recurring subscription for ${subscription.name} (${formatCurrency(subscription.amount, currency)}/${subscription.billing_cycle}).\n\nPlease confirm that my subscription has been terminated and that no future recurring charges will be processed.\n\nThank you for your assistance.\n\nBest regards,`
    );
    Linking.openURL(
      `mailto:support@${subscription.name.toLowerCase().replace(/\s+/g, '')}.com?subject=${subject}&body=${body}`
    );
  };

  return (
    <View
      style={{
        backgroundColor: isDark ? 'rgba(30, 41, 59, 0.45)' : '#FFFFFF',
        borderColor: isUrgent
          ? '#EF4444'
          : isDark
          ? 'rgba(255, 255, 255, 0.08)'
          : 'rgba(226, 232, 240, 0.9)',
      }}
      className="p-4 mb-3 rounded-2xl border shadow-sm"
    >
      <View className="flex-row items-center justify-between mb-2">
        {/* Service Name & Category */}
        <View className="flex-row items-center space-x-2.5 flex-1">
          <View
            style={{ backgroundColor: subscription.color || '#6366F1' }}
            className="w-10 h-10 rounded-2xl items-center justify-center mr-2.5 shadow-sm"
          >
            <Repeat size={18} color="#FFFFFF" />
          </View>
          <View className="flex-1">
            <Text style={{ color: colors.text }} className="text-base font-bold tracking-tight">
              {subscription.name}
            </Text>
            <View className="flex-row items-center space-x-1.5 mt-0.5">
              <Calendar size={12} color={isUrgent ? '#EF4444' : colors.muted} />
              <Text
                style={{ color: isUrgent ? '#EF4444' : colors.muted }}
                className="text-xs font-medium"
              >
                {renewalText}
              </Text>
            </View>
          </View>
        </View>

        {/* Amount & Cycle */}
        <View className="items-end">
          <Text style={{ color: colors.text }} className="text-base font-black">
            {formatCurrency(subscription.amount, currency)}
          </Text>
          <Text style={{ color: colors.muted }} className="text-[10px] font-semibold uppercase">
            /{subscription.billing_cycle === 'yearly' ? 'yr' : 'mo'}
          </Text>
        </View>
      </View>

      {/* Price Creep Alert Badge */}
      {hasPriceCreep ? (
        <View className="mt-2.5 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 flex-row items-center justify-between">
          <View className="flex-row items-center flex-1 mr-2">
            <AlertTriangle size={13} color="#F59E0B" />
            <Text className="text-[11px] text-amber-500 font-bold ml-1.5 flex-1">
              Price Creep: Increased by +{formatCurrency(priceDiff, currency)} (was {formatCurrency(subscription.previous_amount || 0, currency)})
            </Text>
          </View>
        </View>
      ) : null}

      {/* Zombie Subscription Alert Badge */}
      {isZombie ? (
        <View className="mt-2.5 px-3 py-1.5 rounded-xl bg-purple-500/15 border border-purple-500/30 flex-row items-center justify-between">
          <View className="flex-row items-center flex-1 mr-2">
            <Text className="text-xs">🧟</Text>
            <Text className="text-[11px] text-purple-400 font-bold ml-1.5 flex-1">
              Zombie Alert: Untouched for 60+ days.
            </Text>
          </View>
          <Pressable
            onPress={handleGenerateCancelEmail}
            className="py-1 px-2.5 rounded-lg bg-purple-600 active:bg-purple-700 flex-row items-center"
          >
            <Mail size={11} color="#FFFFFF" />
            <Text className="text-white text-[10px] font-bold ml-1">Draft Cancel</Text>
          </Pressable>
        </View>
      ) : null}

      {/* Footer: Status pills & delete */}
      <View className="flex-row justify-between items-center mt-3 pt-2.5 border-t border-slate-700/20">
        <View className="flex-row space-x-1.5">
          {/* Active Status Button */}
          <Pressable
            onPress={() => onToggleStatus(subscription.id, 'active')}
            style={{
              backgroundColor:
                subscription.status === 'active'
                  ? 'rgba(16, 185, 129, 0.2)'
                  : isDark
                  ? 'rgba(51, 65, 85, 0.4)'
                  : '#F1F5F9',
            }}
            className="px-2.5 py-1 rounded-lg flex-row items-center space-x-1 mr-1.5"
          >
            <CheckCircle2 size={12} color={subscription.status === 'active' ? '#10B981' : colors.muted} />
            <Text
              style={{
                color: subscription.status === 'active' ? '#10B981' : colors.muted,
              }}
              className="text-[11px] font-bold"
            >
              Active
            </Text>
          </Pressable>

          {/* To Cancel Status Button */}
          <Pressable
            onPress={() =>
              onToggleStatus(
                subscription.id,
                subscription.status === 'to_cancel' ? 'active' : 'to_cancel'
              )
            }
            style={{
              backgroundColor:
                subscription.status === 'to_cancel'
                  ? 'rgba(239, 68, 68, 0.2)'
                  : isDark
                  ? 'rgba(51, 65, 85, 0.4)'
                  : '#F1F5F9',
            }}
            className="px-2.5 py-1 rounded-lg flex-row items-center space-x-1"
          >
            <AlertTriangle
              size={12}
              color={subscription.status === 'to_cancel' ? '#EF4444' : colors.muted}
            />
            <Text
              style={{
                color: subscription.status === 'to_cancel' ? '#EF4444' : colors.muted,
              }}
              className="text-[11px] font-bold"
            >
              To Cancel
            </Text>
          </Pressable>
        </View>

        <View className="flex-row items-center space-x-2">
          {(subscription.status === 'to_cancel' || hasPriceCreep) && !isZombie ? (
            <Pressable
              onPress={handleGenerateCancelEmail}
              className="py-1 px-2 rounded-lg bg-rose-500/15 border border-rose-500/30 flex-row items-center mr-1"
            >
              <Mail size={11} color="#EF4444" />
              <Text className="text-rose-500 text-[10px] font-bold ml-1">Cancel Email</Text>
            </Pressable>
          ) : null}

          {onMarkPaid && subscription.status === 'active' ? (
            <Pressable
              onPress={() => onMarkPaid(subscription)}
              className="py-1 px-2.5 rounded-lg bg-indigo-600 active:bg-indigo-700 flex-row items-center space-x-1 mr-1"
            >
              <CheckCircle2 size={11} color="#FFFFFF" />
              <Text className="text-white text-[10px] font-bold ml-1">Paid</Text>
            </Pressable>
          ) : null}

          <Pressable onPress={() => onDelete(subscription.id)} className="p-1.5" hitSlop={6}>
            <Trash2 size={14} color={colors.muted} />
          </Pressable>
        </View>
      </View>
    </View>
  );
};
