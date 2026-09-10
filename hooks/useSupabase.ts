import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, getDemoUser, clearDemoUser } from '@/lib/supabase';
import { Expense, Category, Goal, UserProfile, Subscription, ConnectedAccount, ExternalSyncResult } from '@/types/expense';
import {
  fetchConnectedAccounts,
  linkBankAccount,
  syncBankTransactions,
  disconnectBankAccount,
} from '@/lib/pennyBankSync';
import {
  computeEntitlements,
  startProCheckout,
  UserEntitlements,
  ProTier,
} from '@/lib/pennyBilling';

const GOALS_STORAGE_KEY = 'penny_goals';
const SUBSCRIPTIONS_STORAGE_KEY = 'penny_subscriptions';
const PROFILE_STORAGE_KEY = 'penny_profile';
const EXPENSES_STORAGE_KEY = 'penny_expenses';
const INCOME_STORAGE_KEY = 'penny_income';
const USAGE_STATS_KEY = 'penny_usage_stats';
export const PAGE_SIZE = 20;

export interface FinancialHealth {
  balance: number;
  monthly_income: number;
  monthly_subscription_burn: number;
  today_spent: number;
  upcoming_renewals: Array<{
    name: string;
    amount: number;
    next_billing_date: string;
  }>;
}

export async function fetchUserFinancialHealth(userId: string): Promise<FinancialHealth | null> {
  try {
    const { data, error } = await supabase.rpc('get_user_financial_health', { p_user_id: userId });
    if (!error && data) {
      return data as FinancialHealth;
    }
  } catch (err) {
    console.warn('fetchUserFinancialHealth RPC error:', err);
  }
  return null;
}

export async function fetchExpensesPage(userId: string, page: number) {
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  return supabase
    .from('expenses')
    .select('*, categories(name, icon, color)')
    .eq('user_id', userId)
    .order('expense_date', { ascending: false })
    .range(from, to);
}

export function useSupabase() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [financialHealth, setFinancialHealth] = useState<FinancialHealth | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expensesPage, setExpensesPage] = useState<number>(0);
  const [hasMoreExpenses, setHasMoreExpenses] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [incomeTotal, setIncomeTotal] = useState<number>(0);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Fallback initial categories if Supabase table is empty
  const defaultCategories: Category[] = [
    { id: 1, name: 'Food', icon: 'Utensils', color: '#F97316' },
    { id: 2, name: 'Transport', icon: 'Car', color: '#06B6D4' },
    { id: 3, name: 'Bills', icon: 'Receipt', color: '#8B5CF6' },
    { id: 4, name: 'Shopping', icon: 'ShoppingBag', color: '#EC4899' },
    { id: 5, name: 'Entertainment', icon: 'Gamepad2', color: '#6366F1' },
    { id: 6, name: 'Health', icon: 'HeartPulse', color: '#10B981' },
  ];

  // Load goals from local storage
  const loadLocalGoals = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem(GOALS_STORAGE_KEY);
      if (saved) {
        setGoals(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Error reading goals from storage', e);
    }
  }, []);

  const saveGoalsToStorage = async (newGoals: Goal[]) => {
    setGoals(newGoals);
    try {
      await AsyncStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(newGoals));
    } catch (e) {
      console.error('Error saving goals to storage', e);
    }
  };

  const defaultSubscriptions: Subscription[] = [
    {
      id: 'sub_1',
      name: 'Netflix Premium',
      amount: 19.99,
      previous_amount: 15.99,
      billing_cycle: 'monthly',
      next_billing_date: new Date(Date.now() + 4 * 86400000).toISOString(),
      category: 'Entertainment',
      color: '#E50914',
      status: 'active',
      last_status_change_at: new Date(Date.now() - 15 * 86400000).toISOString(),
    },
    {
      id: 'sub_2',
      name: 'Spotify',
      amount: 10.99,
      billing_cycle: 'monthly',
      next_billing_date: new Date(Date.now() + 6 * 86400000).toISOString(),
      category: 'Entertainment',
      color: '#1DB954',
      status: 'active',
      last_status_change_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    },
    {
      id: 'sub_3',
      name: 'Gym Membership',
      amount: 45.00,
      billing_cycle: 'monthly',
      next_billing_date: new Date(Date.now() + 12 * 86400000).toISOString(),
      category: 'Health',
      color: '#F97316',
      status: 'active',
      last_status_change_at: new Date(Date.now() - 72 * 86400000).toISOString(), // 72 days ago -> Zombie!
    },
    {
      id: 'sub_4',
      name: 'iCloud+',
      amount: 2.99,
      billing_cycle: 'monthly',
      next_billing_date: new Date(Date.now() + 19 * 86400000).toISOString(),
      category: 'Bills',
      color: '#007AFF',
      status: 'active',
      last_status_change_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    },
  ];

  const loadLocalSubscriptions = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem(SUBSCRIPTIONS_STORAGE_KEY);
      if (saved) {
        setSubscriptions(JSON.parse(saved));
      } else {
        setSubscriptions(defaultSubscriptions);
        await AsyncStorage.setItem(SUBSCRIPTIONS_STORAGE_KEY, JSON.stringify(defaultSubscriptions));
      }
    } catch (e) {
      console.error('Error reading subscriptions from storage', e);
    }
  }, []);

  const saveSubscriptionsToStorage = async (newSubs: Subscription[]) => {
    setSubscriptions(newSubs);
    try {
      await AsyncStorage.setItem(SUBSCRIPTIONS_STORAGE_KEY, JSON.stringify(newSubs));
    } catch (e) {
      console.error('Error saving subscriptions to storage', e);
    }
  };

  // Fetch all user data
  const fetchData = useCallback(async (currentUser: any) => {
    if (!currentUser) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // 0. Single-roundtrip Financial Health RPC
      try {
        const health = await fetchUserFinancialHealth(currentUser.id);
        if (health) {
          setFinancialHealth(health);
          if (typeof health.monthly_income === 'number' && health.monthly_income > 0) {
            setIncomeTotal(health.monthly_income);
          }
        }
      } catch (e) {
        console.warn('RPC health call bypassed:', e);
      }

      // 1. Profile
      let loadedProfile: UserProfile | null = null;
      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single();
        if (profileData) {
          loadedProfile = profileData;
        }
      } catch {}
      if (!loadedProfile) {
        const savedProf = await AsyncStorage.getItem(PROFILE_STORAGE_KEY);
        if (savedProf) {
          loadedProfile = JSON.parse(savedProf);
        } else {
          loadedProfile = {
            id: currentUser.id,
            full_name: currentUser.user_metadata?.full_name || 'Jordan Vance',
            currency: 'USD',
            monthly_budget: 3500,
          };
          await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(loadedProfile));
        }
      }
      setProfile(loadedProfile);

      // 2. Categories
      let loadedCategories: Category[] = defaultCategories;
      try {
        const { data: catData } = await supabase
          .from('categories')
          .select('*')
          .order('name');
        if (catData && catData.length > 0) {
          loadedCategories = catData;
        }
      } catch {}
      setCategories(loadedCategories);

      // 3. Expenses (Page 0 with limit PAGE_SIZE)
      setExpensesPage(0);
      let loadedExpenses: Expense[] = [];
      try {
        const { data: expData } = await fetchExpensesPage(currentUser.id, 0);
        if (expData && expData.length > 0) {
          loadedExpenses = expData;
          setHasMoreExpenses(expData.length === PAGE_SIZE);
        }
      } catch {}

      if (loadedExpenses.length === 0) {
        const savedExp = await AsyncStorage.getItem(EXPENSES_STORAGE_KEY);
        if (savedExp) {
          loadedExpenses = JSON.parse(savedExp);
          setHasMoreExpenses(false);
        } else {
          const todayStr = new Date().toISOString();
          const yesterdayStr = new Date(Date.now() - 86400000).toISOString();
          const earlierStr = new Date(Date.now() - 3 * 86400000).toISOString();
          loadedExpenses = [
            {
              id: 'exp_1',
              amount: 24.50,
              description: 'Dinner with team',
              expense_date: todayStr,
              category_id: 1,
              categories: { name: 'Food', icon: 'Utensils', color: '#F97316' },
            },
            {
              id: 'exp_2',
              amount: 8.20,
              description: 'Metro ticket',
              expense_date: todayStr,
              category_id: 2,
              categories: { name: 'Transport', icon: 'Car', color: '#06B6D4' },
            },
            {
              id: 'exp_3',
              amount: 45.00,
              description: 'Weekly grocery restocking',
              expense_date: yesterdayStr,
              category_id: 1,
              categories: { name: 'Food', icon: 'Utensils', color: '#F97316' },
            },
            {
              id: 'exp_4',
              amount: 79.99,
              description: 'Studio headphones',
              expense_date: earlierStr,
              category_id: 4,
              categories: { name: 'Shopping', icon: 'ShoppingBag', color: '#EC4899' },
            },
          ];
          await AsyncStorage.setItem(EXPENSES_STORAGE_KEY, JSON.stringify(loadedExpenses));
          setHasMoreExpenses(false);
        }
      }
      setExpenses(loadedExpenses);

      // 4. Income
      let loadedIncome = 0;
      try {
        const { data: incData } = await supabase
          .from('income')
          .select('amount')
          .eq('user_id', currentUser.id);
        if (incData && incData.length > 0) {
          loadedIncome = incData.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
        }
      } catch {}

      if (loadedIncome === 0) {
        const savedInc = await AsyncStorage.getItem(INCOME_STORAGE_KEY);
        loadedIncome = savedInc ? parseFloat(savedInc) : 4200;
        await AsyncStorage.setItem(INCOME_STORAGE_KEY, loadedIncome.toString());
      }
      setIncomeTotal(loadedIncome);

      // 5. Goals & Subscriptions
      await loadLocalGoals();
      await loadLocalSubscriptions();

      // 6. Connected Bank Accounts (Plaid / OpenBanking)
      try {
        const accounts = await fetchConnectedAccounts(currentUser.id);
        setConnectedAccounts(accounts);
      } catch (accErr) {
        console.warn('Connected accounts fetch bypassed:', accErr);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, [loadLocalGoals, loadLocalSubscriptions]);

  useEffect(() => {
    (async () => {
      try {
        const demo = await getDemoUser();
        if (demo) {
          setUser(demo);
          fetchData(demo);
          return;
        }
      } catch {}

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const u = session?.user ?? null;
        setUser(u);
        if (u) {
          fetchData(u);
        } else {
          setLoading(false);
        }
      } catch {
        setLoading(false);
      }
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      if (u) {
        setUser(u);
        fetchData(u);
      } else {
        getDemoUser().then((demo) => {
          if (demo) {
            setUser(demo);
            fetchData(demo);
          } else {
            setUser(null);
            setExpenses([]);
            setProfile(null);
            setIncomeTotal(0);
            setLoading(false);
          }
        });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchData]);

  // Operations
  const addExpense = async (expense: {
    amount: number;
    category_id?: string | number | null;
    description: string;
    expense_date?: string;
    receipt_url?: string | null;
    external_id?: string | null;
    account_id?: string | null;
  }) => {
    if (!user) return false;
    const matchedCategory = categories.find((c) => c.id === expense.category_id);
    const newEntry = {
      id: Date.now().toString(),
      amount: expense.amount,
      category_id: expense.category_id,
      description: expense.description,
      user_id: user.id,
      expense_date: expense.expense_date || new Date().toISOString(),
      receipt_url: expense.receipt_url || null,
      external_id: expense.external_id || null,
      account_id: expense.account_id || null,
      categories: matchedCategory
        ? { name: matchedCategory.name, icon: matchedCategory.icon, color: matchedCategory.color }
        : { name: 'Other', icon: 'CreditCard', color: '#6366F1' },
    };

    try {
      const { data, error } = await supabase
        .from('expenses')
        .insert([{
          amount: newEntry.amount,
          category_id: newEntry.category_id,
          description: newEntry.description,
          expense_date: newEntry.expense_date,
          user_id: user.id,
          receipt_url: newEntry.receipt_url,
          external_id: newEntry.external_id,
          account_id: newEntry.account_id,
        }])
        .select('*, categories(name, icon, color)');
      if (!error && data && data[0]) {
        setExpenses((prev) => [data[0], ...prev]);
        return true;
      }
    } catch {}

    setExpenses((prev) => {
      const next = [newEntry, ...prev];
      AsyncStorage.setItem(EXPENSES_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    return true;
  };

  const deleteExpense = async (id: string) => {
    try {
      await supabase.from('expenses').delete().eq('id', id);
    } catch {}
    setExpenses((prev) => {
      const next = prev.filter((item) => item.id !== id);
      AsyncStorage.setItem(EXPENSES_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    return true;
  };

  const addIncome = async (amount: number, source: string, frequency: string = 'one-time') => {
    if (!user) return false;
    try {
      await supabase.from('income').insert([
        {
          user_id: user.id,
          amount,
          source,
          frequency,
          income_date: new Date().toISOString(),
        },
      ]);
    } catch {}
    setIncomeTotal((prev) => {
      const next = prev + amount;
      AsyncStorage.setItem(INCOME_STORAGE_KEY, next.toString());
      return next;
    });
    return true;
  };

  const saveGoal = async (goal: Omit<Goal, 'id' | 'created_at'> & { id?: string }) => {
    let updated: Goal[];
    if (goal.id) {
      updated = goals.map((g) => (g.id === goal.id ? { ...g, ...goal } : g));
    } else {
      const newGoal: Goal = {
        ...goal,
        id: Date.now().toString(),
        created_at: new Date().toISOString(),
      };
      updated = [newGoal, ...goals];
    }
    await saveGoalsToStorage(updated);
  };

  const deleteGoal = async (id: string) => {
    const updated = goals.filter((g) => g.id !== id);
    await saveGoalsToStorage(updated);
  };

  const addFundsToGoal = async (id: string, amount: number) => {
    const updated = goals.map((g) => {
      if (g.id === id) {
        return { ...g, current: Math.min(g.target, g.current + amount) };
      }
      return g;
    });
    await saveGoalsToStorage(updated);
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return false;
    try {
      await supabase.from('profiles').update(updates).eq('id', user.id);
    } catch {}
    setProfile((prev) => {
      const next = prev ? { ...prev, ...updates } : null;
      if (next) AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    return true;
  };

  const saveSubscription = async (sub: Omit<Subscription, 'id' | 'created_at'> & { id?: string }) => {
    let updated: Subscription[];
    if (sub.id) {
      updated = subscriptions.map((s) => {
        if (s.id === sub.id) {
          const previousAmount = s.amount !== sub.amount ? s.amount : (s.previous_amount ?? null);
          return {
            ...s,
            ...sub,
            previous_amount: previousAmount,
            last_status_change_at: s.status !== sub.status ? new Date().toISOString() : s.last_status_change_at,
          };
        }
        return s;
      });
    } else {
      const newSub: Subscription = {
        ...sub,
        id: Date.now().toString(),
        last_status_change_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };
      updated = [newSub, ...subscriptions];
    }
    await saveSubscriptionsToStorage(updated);
  };

  const deleteSubscription = async (id: string) => {
    const updated = subscriptions.filter((s) => s.id !== id);
    await saveSubscriptionsToStorage(updated);
  };

  const toggleSubscriptionStatus = async (id: string, status: 'active' | 'paused' | 'to_cancel') => {
    const updated = subscriptions.map((s) =>
      s.id === id ? { ...s, status, last_status_change_at: new Date().toISOString() } : s
    );
    await saveSubscriptionsToStorage(updated);
  };

  const monthlySubscriptionBurn = subscriptions
    .filter((s) => s.status === 'active')
    .reduce((sum, s) => {
      if (s.billing_cycle === 'yearly') return sum + s.amount / 12;
      if (s.billing_cycle === 'weekly') return sum + s.amount * 4.33;
      return sum + s.amount;
    }, 0);

  const loadMoreExpenses = async () => {
    if (!user || loadingMore || !hasMoreExpenses) return;
    setLoadingMore(true);
    try {
      const nextPage = expensesPage + 1;
      const { data: nextData, error } = await fetchExpensesPage(user.id, nextPage);
      if (!error && nextData) {
        if (nextData.length < PAGE_SIZE) {
          setHasMoreExpenses(false);
        }
        setExpensesPage(nextPage);
        setExpenses((prev) => {
          const existingIds = new Set(prev.map((e) => e.id));
          const newItems = nextData.filter((e) => !existingIds.has(e.id));
          return [...prev, ...newItems];
        });
      } else {
        setHasMoreExpenses(false);
      }
    } catch (err) {
      console.error('Error loading more expenses:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const linkAccount = async (institutionName: string): Promise<ConnectedAccount> => {
    const acc = await linkBankAccount(institutionName, user?.id);
    setConnectedAccounts((prev) => [acc, ...prev.filter((a) => a.id !== acc.id)]);
    return acc;
  };

  const syncAccount = async (account?: ConnectedAccount): Promise<ExternalSyncResult> => {
    const targetAccount = account || connectedAccounts[0];
    const result = await syncBankTransactions(
      targetAccount?.id,
      targetAccount?.institution_name,
      user?.id
    );

    // Ingest imported transactions into local state and storage
    if (result.latestTransactions && result.latestTransactions.length > 0) {
      for (const t of result.latestTransactions) {
        await addExpense({
          amount: t.amount,
          description: t.description || t.merchant || 'Bank Transaction',
          expense_date: t.date,
          external_id: t.external_id,
        });
      }
      if (user) {
        const health = await fetchUserFinancialHealth(user.id);
        if (health) setFinancialHealth(health);
      }
    }

    setConnectedAccounts((prev) =>
      prev.map((a) =>
        !targetAccount || a.id === targetAccount.id
          ? { ...a, last_synced_at: new Date().toISOString() }
          : a
      )
    );

    return result;
  };

  const disconnectAccount = async (accountId: string): Promise<boolean> => {
    await disconnectBankAccount(accountId, user?.id);
    setConnectedAccounts((prev) => prev.filter((a) => a.id !== accountId));
    return true;
  };

  // Usage stats & Pro Entitlements
  const [receiptScansCount, setReceiptScansCount] = useState<number>(0);
  const [coachQueriesCount, setCoachQueriesCount] = useState<number>(0);

  useEffect(() => {
    AsyncStorage.getItem(USAGE_STATS_KEY).then((data) => {
      if (data) {
        try {
          const parsed = JSON.parse(data);
          setReceiptScansCount(parsed.scans || 0);
          setCoachQueriesCount(parsed.coach || 0);
        } catch {}
      }
    });
  }, []);

  const entitlements: UserEntitlements = useMemo(() => {
    return computeEntitlements(
      profile,
      receiptScansCount,
      coachQueriesCount,
      connectedAccounts.length
    );
  }, [profile, receiptScansCount, coachQueriesCount, connectedAccounts.length]);

  const isPro = !!(profile?.is_pro);
  const proTier: ProTier = (profile?.pro_tier as ProTier) || (isPro ? 'annual' : 'free');

  const upgradeToPro = async (tier: 'monthly' | 'annual' = 'annual'): Promise<boolean> => {
    if (!user) return false;
    let token: string | undefined;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      token = sessionData.session?.access_token;
    } catch {}

    await startProCheckout(tier, token);

    // Update Pro state locally for immediate testing
    const expires = new Date();
    if (tier === 'annual') {
      expires.setFullYear(expires.getFullYear() + 1);
    } else {
      expires.setMonth(expires.getMonth() + 1);
    }

    const updatedProfile: UserProfile = {
      ...(profile || { id: user.id, full_name: 'Jordan Vance', currency: 'USD' }),
      is_pro: true,
      pro_tier: tier,
      pro_expires_at: expires.toISOString(),
    };

    setProfile(updatedProfile);
    await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(updatedProfile));
    try {
      await supabase.from('profiles').update({
        is_pro: true,
        pro_tier: tier,
        pro_expires_at: expires.toISOString(),
      }).eq('id', user.id);
    } catch {}

    return true;
  };

  const toggleDevProMode = async (): Promise<boolean> => {
    if (!user) return false;
    const nextPro = !profile?.is_pro;
    const updatedProfile: UserProfile = {
      ...(profile || { id: user.id, full_name: 'Jordan Vance', currency: 'USD' }),
      is_pro: nextPro,
      pro_tier: nextPro ? 'annual' : 'free',
      pro_expires_at: nextPro ? new Date(Date.now() + 365 * 86400000).toISOString() : null,
    };
    setProfile(updatedProfile);
    await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(updatedProfile));
    try {
      await supabase.from('profiles').update({
        is_pro: nextPro,
        pro_tier: nextPro ? 'annual' : 'free',
      }).eq('id', user.id);
    } catch {}
    return nextPro;
  };

  const recordReceiptScan = async () => {
    setReceiptScansCount((prev) => {
      const next = prev + 1;
      AsyncStorage.setItem(USAGE_STATS_KEY, JSON.stringify({ scans: next, coach: coachQueriesCount }));
      return next;
    });
  };

  const recordCoachQuery = async () => {
    setCoachQueriesCount((prev) => {
      const next = prev + 1;
      AsyncStorage.setItem(USAGE_STATS_KEY, JSON.stringify({ scans: receiptScansCount, coach: next }));
      return next;
    });
  };

  return {
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
    refreshData: () => user && fetchData(user),
    addExpense,
    deleteExpense,
    addIncome,
    saveGoal,
    deleteGoal,
    addFundsToGoal,
    saveSubscription,
    deleteSubscription,
    toggleSubscriptionStatus,
    updateProfile,
    linkAccount,
    syncAccount,
    disconnectAccount,
    isPro,
    proTier,
    entitlements,
    upgradeToPro,
    toggleDevProMode,
    recordReceiptScan,
    recordCoachQuery,
    signOut: async () => {
      await clearDemoUser();
      try {
        await supabase.auth.signOut();
      } catch {}
      setUser(null);
      setExpenses([]);
      setProfile(null);
    },
  };
}
