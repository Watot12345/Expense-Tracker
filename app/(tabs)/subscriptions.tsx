import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Repeat, Plus } from 'lucide-react-native';
import { useSupabase } from '@/hooks/useSupabase';
import { useTheme } from '@/hooks/useTheme';
import { SubscriptionBurnSummary } from '@/components/SubscriptionBurnSummary';
import { RenewalRadar } from '@/components/RenewalRadar';
import { SubscriptionCard } from '@/components/SubscriptionCard';
import { SubscriptionModal } from '@/components/SubscriptionModal';
import { advanceBillingDate } from '@/lib/subscriptions';
import { Subscription } from '@/types/subscription';

export default function SubscriptionsScreen() {
  const { colors } = useTheme();
  const {
    subscriptions,
    profile,
    saveSubscription,
    deleteSubscription,
    toggleSubscriptionStatus,
    addExpense,
  } = useSupabase();

  const [modalVisible, setModalVisible] = useState(false);
  const currency = profile?.currency || 'USD';

  const activeSubs = subscriptions.filter((s) => s.status === 'active');
  const pausedSubs = subscriptions.filter((s) => s.status === 'paused');
  const toCancelSubs = subscriptions.filter((s) => s.status === 'to_cancel');

  // Zombie & Price Creep Detection
  const sixtyDaysAgo = Date.now() - 60 * 86400000;
  const zombieSubs = subscriptions.filter((s) => {
    const lastChange = s.last_status_change_at ? new Date(s.last_status_change_at).getTime() : 0;
    return s.status === 'active' && lastChange > 0 && lastChange < sixtyDaysAgo;
  });

  const priceCreepSubs = subscriptions.filter(
    (s) => s.previous_amount !== undefined && s.previous_amount !== null && s.previous_amount !== s.amount
  );

  const handleDelete = (id: string) => {
    Alert.alert('Delete Subscription', 'Remove this subscription from your recurring list?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteSubscription(id) },
    ]);
  };

  const handleMarkPaid = async (sub: Subscription) => {
    const { updatedSubscription, expensePayload } = advanceBillingDate(sub);
    await addExpense(expensePayload);
    await saveSubscription(updatedSubscription);
    Alert.alert('Payment Recorded', `Logged ${sub.name} payment and advanced next billing date.`);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'left', 'right']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
      >
        {/* Header */}
        <View className="flex-row justify-between items-center mt-2 mb-5">
          <View>
            <Text style={{ color: colors.text }} className="text-2xl font-black tracking-tight">
              Subscriptions 🔁
            </Text>
            <Text style={{ color: colors.muted }} className="text-xs font-medium mt-0.5">
              Audit and track your recurring monthly commitments
            </Text>
          </View>

          <Pressable
            onPress={() => setModalVisible(true)}
            className="w-10 h-10 rounded-2xl bg-indigo-600 items-center justify-center shadow-md active:scale-95"
          >
            <Plus size={20} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Zombie & Price-Creep Radar Banner */}
        {zombieSubs.length > 0 || priceCreepSubs.length > 0 ? (
          <View
            style={{
              backgroundColor: 'rgba(168, 85, 247, 0.12)',
              borderColor: 'rgba(168, 85, 247, 0.35)',
            }}
            className="p-4 rounded-3xl border mb-5 shadow-sm"
          >
            <View className="flex-row items-center justify-between mb-1.5">
              <View className="flex-row items-center">
                <Text className="text-sm mr-1.5">🧟</Text>
                <Text className="text-xs font-black text-purple-400 uppercase tracking-wider">
                  Zombie & Price Radar Alert
                </Text>
              </View>
              <Text className="text-[10px] text-purple-300 font-semibold">
                {zombieSubs.length + priceCreepSubs.length} Action Items
              </Text>
            </View>
            <Text style={{ color: colors.text }} className="text-xs font-medium leading-relaxed">
              {zombieSubs.length > 0 && priceCreepSubs.length > 0
                ? `Detected ${zombieSubs.length} unreviewed 60+ day subscription(s) and ${priceCreepSubs.length} price increase(s). Review each card below to draft 1-tap cancellation emails.`
                : zombieSubs.length > 0
                ? `Detected ${zombieSubs.length} untouched 60+ day active subscription(s). Consider auditing them below.`
                : `Detected ${priceCreepSubs.length} price increase(s) across your active plans.`}
            </Text>
          </View>
        ) : null}

        {/* 1. Subscription Burn Summary KPI Card */}
        <SubscriptionBurnSummary subscriptions={subscriptions} currency={currency} />

        {/* 2. Renewal Radar (Next 7 Days) */}
        <RenewalRadar
          subscriptions={subscriptions}
          currency={currency}
          onMarkPaid={handleMarkPaid}
        />

        {/* 3. Subscriptions List Grouped by Status */}
        {subscriptions.length === 0 ? (
          <View className="py-16 items-center justify-center">
            <View className="w-16 h-16 rounded-full bg-indigo-500/20 items-center justify-center mb-3">
              <Repeat size={32} color="#6366F1" />
            </View>
            <Text style={{ color: colors.text }} className="text-base font-bold">
              No Subscriptions Tracked
            </Text>
            <Text style={{ color: colors.muted }} className="text-xs text-center max-w-[240px] mt-1 mb-5">
              Add your streaming, gym, software, and cloud subscriptions to monitor recurring spend.
            </Text>
            <Pressable
              onPress={() => setModalVisible(true)}
              className="py-3 px-5 rounded-2xl bg-indigo-600 active:bg-indigo-700"
            >
              <Text className="text-white text-xs font-bold">Add First Subscription</Text>
            </Pressable>
          </View>
        ) : (
          <View className="mt-2">
            {/* Active Subscriptions */}
            {activeSubs.length > 0 ? (
              <View className="mb-4">
                <Text style={{ color: colors.text }} className="text-sm font-bold mb-2.5">
                  Active ({activeSubs.length})
                </Text>
                {activeSubs.map((sub) => (
                  <SubscriptionCard
                    key={sub.id}
                    subscription={sub}
                    currency={currency}
                    onToggleStatus={toggleSubscriptionStatus}
                    onDelete={handleDelete}
                    onMarkPaid={handleMarkPaid}
                  />
                ))}
              </View>
            ) : null}

            {/* To Cancel Subscriptions */}
            {toCancelSubs.length > 0 ? (
              <View className="mb-4">
                <Text style={{ color: colors.text }} className="text-sm font-bold mb-2.5 text-rose-500">
                  To Cancel ({toCancelSubs.length})
                </Text>
                {toCancelSubs.map((sub) => (
                  <SubscriptionCard
                    key={sub.id}
                    subscription={sub}
                    currency={currency}
                    onToggleStatus={toggleSubscriptionStatus}
                    onDelete={handleDelete}
                    onMarkPaid={handleMarkPaid}
                  />
                ))}
              </View>
            ) : null}

            {/* Paused Subscriptions */}
            {pausedSubs.length > 0 ? (
              <View className="mb-4">
                <Text style={{ color: colors.muted }} className="text-sm font-bold mb-2.5">
                  Paused ({pausedSubs.length})
                </Text>
                {pausedSubs.map((sub) => (
                  <SubscriptionCard
                    key={sub.id}
                    subscription={sub}
                    currency={currency}
                    onToggleStatus={toggleSubscriptionStatus}
                    onDelete={handleDelete}
                    onMarkPaid={handleMarkPaid}
                  />
                ))}
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>

      {/* Subscription Modal */}
      <SubscriptionModal
        visible={modalVisible}
        currencySymbol={currency === 'USD' ? '$' : currency}
        onClose={() => setModalVisible(false)}
        onSave={async (sub) => {
          await saveSubscription(sub);
        }}
      />
    </SafeAreaView>
  );
}
