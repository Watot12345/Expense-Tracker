import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  Pressable,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, PlusCircle, X, Crown, Sparkles } from 'lucide-react-native';
import { useSupabase } from '@/hooks/useSupabase';
import { useTheme } from '@/hooks/useTheme';
import { BalanceCard } from '@/components/BalanceCard';
import { QuickAddBar } from '@/components/QuickAddBar';
import { TransactionRow } from '@/components/TransactionRow';
import { ExpenseModal } from '@/components/ExpenseModal';
import { ReceiptScannerModal } from '@/components/ReceiptScannerModal';
import { ConnectedAccountsModal } from '@/components/ConnectedAccountsModal';
import { ProPaywallModal } from '@/components/ProPaywallModal';
import { AffiliateMarketplaceCard } from '@/components/AffiliateMarketplaceCard';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SafeToSpendDial } from '@/components/SafeToSpendDial';
import { exportExpensesCSV } from '@/lib/csvExport';
import { calculateSafeToSpend } from '@/lib/safeToSpend';
import { Expense } from '@/types/expense';

function getDateGroup(dateStr?: string): 'Today' | 'Yesterday' | 'Earlier' {
  if (!dateStr) return 'Earlier';
  const target = new Date(dateStr);
  if (isNaN(target.getTime())) return 'Earlier';

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).getTime();
  const itemDate = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();

  if (itemDate === today) return 'Today';
  if (itemDate === yesterday) return 'Yesterday';
  return 'Earlier';
}

export default function HomeScreen() {
  const { colors, isDark } = useTheme();
  const {
    user,
    profile,
    financialHealth,
    expenses,
    hasMoreExpenses,
    loadingMore,
    loadMoreExpenses,
    categories,
    incomeTotal,
    goals,
    subscriptions,
    monthlySubscriptionBurn,
    connectedAccounts,
    loading,
    refreshData,
    addExpense,
    deleteExpense,
    addIncome,
    saveSubscription,
    linkAccount,
    syncAccount,
    disconnectAccount,
    isPro,
    proTier,
    entitlements,
    upgradeToPro,
    toggleDevProMode,
    recordReceiptScan,
  } = useSupabase();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [expenseModalVisible, setExpenseModalVisible] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [scannerModalVisible, setScannerModalVisible] = useState(false);
  const [bankModalVisible, setBankModalVisible] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [incomeModalVisible, setIncomeModalVisible] = useState(false);
  const [incomeAmount, setIncomeAmount] = useState('');
  const [incomeSource, setIncomeSource] = useState('');

  const handleOpenReceiptScanner = () => {
    if (!isPro && entitlements.scans_remaining <= 0) {
      Alert.alert(
        'Free Limit Reached (5/5)',
        'You have used all 5 free receipt scans this month. Upgrade to PennyFlow Pro for unlimited Gemini Vision receipt scans!',
        [
          { text: 'Later', style: 'cancel' },
          { text: 'View Pro Plans', onPress: () => setPaywallVisible(true) },
        ]
      );
      return;
    }
    setScannerModalVisible(true);
  };

  // Calculate totals (Single-roundtrip RPC prioritized over client aggregation)
  const totalExpenses = useMemo(() => {
    return expenses.reduce((sum, item) => sum + (item.amount || 0), 0);
  }, [expenses]);

  const balance = financialHealth?.balance !== undefined ? financialHealth.balance : incomeTotal - totalExpenses;
  const currency = profile?.currency || 'USD';

  // Compute today's logged expenses so far
  const todaySpendSoFar = useMemo(() => {
    if (financialHealth?.today_spent !== undefined) {
      return financialHealth.today_spent;
    }
    const todayStr = new Date().toISOString().split('T')[0];
    return expenses
      .filter((e) => {
        const d = (e.expense_date || e.created_at || '').split('T')[0];
        return d === todayStr;
      })
      .reduce((sum, e) => sum + (e.amount || 0), 0);
  }, [financialHealth, expenses]);

  // Compute monthly savings goals target pool
  const monthlySavingsGoalTarget = useMemo(() => {
    return (goals || []).reduce((sum, g) => {
      const remaining = Math.max(0, g.target - g.current);
      return sum + remaining / 3;
    }, 0);
  }, [goals]);

  // Compute Safe-to-Spend breakdown using single-roundtrip RPC burn or local fallback
  const effectiveSubscriptionBurn = financialHealth?.monthly_subscription_burn ?? monthlySubscriptionBurn;

  const safeToSpendData = useMemo(() => {
    return calculateSafeToSpend({
      monthlyIncome: incomeTotal > 0 ? incomeTotal : profile?.monthly_budget || 0,
      monthlySubscriptionBurn: effectiveSubscriptionBurn,
      monthlySavingsGoalTarget,
      todaySpendSoFar,
    });
  }, [incomeTotal, profile, effectiveSubscriptionBurn, monthlySavingsGoalTarget, todaySpendSoFar]);

  // Filter expenses based on search & category chip
  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      const catName = exp.categories?.name || 'Other';
      const matchesCategory = selectedFilter === 'all' || catName.toLowerCase() === selectedFilter.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        catName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (exp.description && exp.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [expenses, selectedFilter, searchQuery]);

  // Handle Quick Add via Natural Language
  const handleQuickAdd = async ({
    amount,
    category,
    description,
  }: {
    amount: number;
    category: string;
    description: string;
  }) => {
    const matchedCategory = categories.find(
      (c) => c.name.toLowerCase() === category.toLowerCase()
    );
    const category_id = matchedCategory ? matchedCategory.id : categories[0]?.id || null;
    return await addExpense({ amount, category_id, description });
  };

  // Handle Save from Modal
  const handleSaveExpense = async (data: {
    amount: number;
    category_id: string | number;
    description: string;
  }) => {
    await addExpense(data);
  };

  // Handle Add Income
  const handleSaveIncome = async () => {
    const num = parseFloat(incomeAmount);
    if (isNaN(num) || num <= 0) return;
    const finalSource = incomeSource.trim() || 'Salary Deposit';
    await addIncome(num, finalSource);
    setIncomeAmount('');
    setIncomeSource('');
    setIncomeModalVisible(false);
  };

  const handleDeleteExpense = (id: string) => {
    Alert.alert('Delete Expense', 'Are you sure you want to delete this transaction?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteExpense(id) },
    ]);
  };

  const userName = profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'there';

  const renderHeader = () => (
    <View>
      {/* Top Header */}
      <View className="flex-row justify-between items-center mt-2 mb-5">
        <View>
          <Text style={{ color: colors.text }} className="text-2xl font-black tracking-tight">
            Hey, {userName} 👋
          </Text>
          <Text style={{ color: colors.muted }} className="text-xs font-medium mt-0.5">
            Keep your spending smart
          </Text>
        </View>

        <View className="flex-row items-center space-x-2">
          {/* Pro Upgrade / Active Badge */}
          <Pressable
            onPress={() => setPaywallVisible(true)}
            className="flex-row items-center px-3 py-1.5 rounded-full active:opacity-75"
            style={{
              backgroundColor: isPro ? 'rgba(245, 158, 11, 0.15)' : 'rgba(99, 102, 241, 0.15)',
              borderWidth: 1,
              borderColor: isPro ? 'rgba(245, 158, 11, 0.4)' : 'rgba(99, 102, 241, 0.4)',
            }}
          >
            {isPro ? (
              <>
                <Crown size={14} color="#F59E0B" />
                <Text className="text-[11px] font-black text-amber-500 ml-1 uppercase tracking-wider">
                  PRO
                </Text>
              </>
            ) : (
              <>
                <Sparkles size={14} color="#6366F1" />
                <Text className="text-[11px] font-bold text-indigo-500 ml-1">
                  Upgrade
                </Text>
              </>
            )}
          </Pressable>

          <ThemeToggle />
        </View>
      </View>

      {/* Safe to Spend Today Dial */}
      <SafeToSpendDial data={safeToSpendData} currency={currency} />

      {/* Balance Card */}
      <BalanceCard
        balance={balance}
        income={incomeTotal}
        expense={totalExpenses}
        currency={currency}
        onAddExpense={() => {
          setEditingExpense(null);
          setExpenseModalVisible(true);
        }}
        onAddIncome={() => setIncomeModalVisible(true)}
        onScanReceipt={handleOpenReceiptScanner}
        onOpenBankSync={() => setBankModalVisible(true)}
        onExportCSV={() => exportExpensesCSV(expenses)}
      />

      {/* Natural Language Quick Add Bar + AI Receipt Scanner */}
      <QuickAddBar
        onAdd={handleQuickAdd}
        onOpenScanner={handleOpenReceiptScanner}
        currency={currency}
      />

      {/* Search & Filter Section */}
      <View className="mb-4">
        <View
          style={{
            backgroundColor: isDark ? 'rgba(30, 41, 59, 0.4)' : '#FFFFFF',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
          }}
          className="flex-row items-center rounded-2xl border px-3.5 py-2 mb-3"
        >
          <Search size={16} color={colors.muted} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search expenses..."
            placeholderTextColor={colors.muted}
            style={{ color: colors.text }}
            className="flex-1 ml-2 text-xs font-medium"
          />
          {searchQuery ? (
            <Pressable onPress={() => setSearchQuery('')}>
              <X size={14} color={colors.muted} />
            </Pressable>
          ) : null}
        </View>

        {/* Filter Chips Horizontal List */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
          <Pressable
            onPress={() => setSelectedFilter('all')}
            style={{
              backgroundColor: selectedFilter === 'all' ? '#6366F1' : isDark ? '#1E293B' : '#F1F5F9',
            }}
            className="px-3.5 py-1.5 rounded-full mr-2"
          >
            <Text
              style={{ color: selectedFilter === 'all' ? '#FFFFFF' : colors.muted }}
              className="text-xs font-bold"
            >
              All ({expenses.length})
            </Text>
          </Pressable>
          {categories.map((cat) => {
            const isSelected = selectedFilter.toLowerCase() === cat.name.toLowerCase();
            return (
              <Pressable
                key={cat.id}
                onPress={() => setSelectedFilter(cat.name)}
                style={{
                  backgroundColor: isSelected ? '#6366F1' : isDark ? '#1E293B' : '#F1F5F9',
                }}
                className="px-3.5 py-1.5 rounded-full mr-2"
              >
                <Text
                  style={{ color: isSelected ? '#FFFFFF' : colors.muted }}
                  className="text-xs font-bold"
                >
                  {cat.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Smart Financial Rewards & Affiliate Offers */}
      <AffiliateMarketplaceCard />

      {/* Transaction History Header */}
      <View className="mt-2 mb-2 flex-row justify-between items-center">
        <Text style={{ color: colors.text }} className="text-base font-bold tracking-tight">
          Recent Transactions
        </Text>
        <Text style={{ color: colors.muted }} className="text-xs">
          {filteredExpenses.length} entries
        </Text>
      </View>
    </View>
  );

  const renderExpenseItem = ({ item, index }: { item: Expense; index: number }) => {
    const currentGroup = getDateGroup(item.expense_date || item.created_at);
    const prevItem = index > 0 ? filteredExpenses[index - 1] : null;
    const prevGroup = prevItem ? getDateGroup(prevItem.expense_date || prevItem.created_at) : null;
    const showHeader = currentGroup !== prevGroup;

    return (
      <View key={item.id}>
        {showHeader && (
          <View className="flex-row items-center justify-between mb-2 mt-3">
            <View
              style={{
                backgroundColor:
                  currentGroup === 'Today'
                    ? 'rgba(99, 102, 241, 0.15)'
                    : currentGroup === 'Yesterday'
                    ? 'rgba(14, 165, 233, 0.15)'
                    : isDark
                    ? 'rgba(148, 163, 184, 0.12)'
                    : 'rgba(203, 213, 225, 0.5)',
              }}
              className="px-2.5 py-0.5 rounded-md"
            >
              <Text
                style={{
                  color:
                    currentGroup === 'Today'
                      ? '#818CF8'
                      : currentGroup === 'Yesterday'
                      ? '#38BDF8'
                      : colors.muted,
                }}
                className="text-[10px] font-extrabold uppercase tracking-wider"
              >
                {currentGroup}
              </Text>
            </View>
            <View
              style={{ backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#E2E8F0' }}
              className="h-[1px] flex-1 ml-3"
            />
          </View>
        )}
        <TransactionRow
          expense={item}
          currency={currency}
          onEdit={(item) => {
            setEditingExpense(item);
            setExpenseModalVisible(true);
          }}
          onDelete={handleDeleteExpense}
        />
      </View>
    );
  };

  const renderFooter = () => {
    if (loadingMore) {
      return (
        <View className="py-6 items-center justify-center">
          <ActivityIndicator size="small" color="#6366F1" />
          <Text style={{ color: colors.muted }} className="text-xs font-medium mt-2">
            Loading more transactions...
          </Text>
        </View>
      );
    }
    if (!hasMoreExpenses && filteredExpenses.length > 0) {
      return (
        <View className="py-6 items-center justify-center">
          <Text style={{ color: colors.muted }} className="text-xs">
            End of transactions
          </Text>
        </View>
      );
    }
    return null;
  };

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View className="py-12 items-center justify-center">
        <Text className="text-4xl mb-2">💸</Text>
        <Text style={{ color: colors.muted }} className="text-sm font-semibold">
          No expenses found
        </Text>
        <Text style={{ color: colors.muted }} className="text-xs mt-1">
          Type above or tap + Expense to record one
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'left', 'right']}>
      <FlatList
        data={filteredExpenses}
        keyExtractor={(item) => item.id}
        renderItem={renderExpenseItem}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        onEndReached={loadMoreExpenses}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refreshData} tintColor="#6366F1" />
        }
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      />

      {/* Expense Modal */}
      <ExpenseModal
        visible={expenseModalVisible}
        categories={categories}
        initialData={editingExpense}
        onClose={() => {
          setExpenseModalVisible(false);
          setEditingExpense(null);
        }}
        onSave={handleSaveExpense}
      />

      {/* AI Vision Receipt Scanner Modal */}
      <ReceiptScannerModal
        visible={scannerModalVisible}
        currencySymbol={currency === 'USD' ? '$' : currency}
        onClose={() => setScannerModalVisible(false)}
        onSaveExpense={async ({ amount, category, description, date, receipt_url }) => {
          const matchedCategory = categories.find(
            (c) => c.name.toLowerCase() === category.toLowerCase()
          );
          const category_id = matchedCategory ? matchedCategory.id : categories[0]?.id || null;
          await addExpense({
            amount,
            category_id,
            description,
            expense_date: date,
            receipt_url,
          });
          await recordReceiptScan();
        }}
        onAddAsSubscription={async (sub) => {
          const nextDate = new Date();
          if (sub.billing_cycle === 'yearly') nextDate.setFullYear(nextDate.getFullYear() + 1);
          else if (sub.billing_cycle === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
          else nextDate.setMonth(nextDate.getMonth() + 1);

          await saveSubscription({
            name: sub.name,
            amount: sub.amount,
            billing_cycle: sub.billing_cycle,
            category: sub.category,
            color: sub.color,
            status: 'active',
            next_billing_date: nextDate.toISOString(),
          });
          Alert.alert('Subscription Tracked', `${sub.name} added to your Subscriptions Radar!`);
        }}
      />

      {/* PennyFlow Pro Paywall Modal */}
      <ProPaywallModal
        visible={paywallVisible}
        isPro={isPro}
        onClose={() => setPaywallVisible(false)}
        onUpgrade={upgradeToPro}
        onToggleDevPro={toggleDevProMode}
      />

      {/* Linked Bank & Spending App Accounts Modal */}
      <ConnectedAccountsModal
        visible={bankModalVisible}
        accounts={connectedAccounts}
        currencySymbol={currency === 'USD' ? '$' : currency}
        isPro={isPro}
        onClose={() => setBankModalVisible(false)}
        onLinkAccount={linkAccount}
        onSyncAccount={syncAccount}
        onDisconnectAccount={disconnectAccount}
        onOpenPaywall={() => setPaywallVisible(true)}
      />

      {/* Income Modal */}
      <Modal visible={incomeModalVisible} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/60">
          <View
            style={{
              backgroundColor: isDark ? '#111827' : '#FFFFFF',
              borderTopColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E2E8F0',
            }}
            className="p-6 rounded-t-[36px] border-t"
          >
            <View className="flex-row justify-between items-center mb-5">
              <Text style={{ color: colors.text }} className="text-xl font-bold">
                Add Income
              </Text>
              <Pressable onPress={() => setIncomeModalVisible(false)}>
                <X size={20} color={colors.muted} />
              </Pressable>
            </View>

            <View className="mb-4">
              <Text style={{ color: colors.muted }} className="text-xs font-semibold mb-2">
                Source
              </Text>
              <TextInput
                value={incomeSource}
                onChangeText={setIncomeSource}
                placeholder="e.g. Salary, Freelance, Bonus"
                placeholderTextColor={colors.muted}
                style={{
                  color: colors.text,
                  backgroundColor: isDark ? 'rgba(30, 41, 59, 0.6)' : '#F8FAFC',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
                }}
                className="py-3 px-4 rounded-2xl border text-sm font-medium"
              />
            </View>

            <View className="mb-4">
              <Text style={{ color: colors.muted }} className="text-xs font-semibold mb-2">
                Amount ({currency})
              </Text>
              <TextInput
                value={incomeAmount}
                onChangeText={setIncomeAmount}
                placeholder="0.00"
                keyboardType="decimal-pad"
                placeholderTextColor={colors.muted}
                style={{
                  color: colors.text,
                  backgroundColor: isDark ? 'rgba(30, 41, 59, 0.6)' : '#F8FAFC',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
                }}
                className="py-3 px-4 rounded-2xl border text-xl font-bold"
              />
            </View>

            {/* Quick Preset Buttons */}
            <View className="flex-row items-center space-x-2 mb-6">
              {[500, 1000, 2500, 5000].map((amt) => {
                const isSelected = incomeAmount === amt.toString();
                return (
                  <Pressable
                    key={amt}
                    onPress={() => {
                      setIncomeAmount(amt.toString());
                      if (!incomeSource.trim()) setIncomeSource('Salary Deposit');
                    }}
                    className="flex-1 py-2.5 rounded-xl items-center justify-center border"
                    style={{
                      backgroundColor: isSelected ? '#10B981' : isDark ? 'rgba(30, 41, 59, 0.7)' : '#F1F5F9',
                      borderColor: isSelected ? '#10B981' : isDark ? 'rgba(255, 255, 255, 0.1)' : '#E2E8F0',
                    }}
                  >
                    <Text
                      style={{
                        color: isSelected ? '#FFFFFF' : colors.text,
                        fontWeight: '700',
                        fontSize: 12,
                      }}
                    >
                      +${amt >= 1000 ? `${amt / 1000}k` : amt}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              onPress={handleSaveIncome}
              className="py-4 rounded-2xl bg-emerald-600 active:bg-emerald-700 items-center justify-center shadow-lg mb-4"
            >
              <Text className="text-white font-bold text-base">Save Income</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
