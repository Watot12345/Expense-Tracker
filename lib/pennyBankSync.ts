import AsyncStorage from '@react-native-async-storage/async-storage';
import { SUPABASE_URL } from '@/lib/supabase';
import { ConnectedAccount, ExternalSyncResult } from '@/types/account';

const CONNECTED_ACCOUNTS_KEY = 'penny_connected_accounts';

const DEFAULT_ACCOUNTS: ConnectedAccount[] = [
  {
    id: 'acc_chase_4821',
    provider: 'sandbox',
    institution_name: 'Chase Sapphire Preferred',
    institution_logo: 'chase',
    account_name: 'Chase Sapphire Checking',
    account_mask: '4821',
    account_type: 'checking',
    balance: 3450.00,
    currency: 'USD',
    status: 'active',
    last_synced_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'acc_apple_1084',
    provider: 'sandbox',
    institution_name: 'Apple Card',
    institution_logo: 'apple',
    account_name: 'Apple Card Master',
    account_mask: '1084',
    account_type: 'credit',
    balance: 1420.75,
    currency: 'USD',
    status: 'active',
    last_synced_at: new Date(Date.now() - 7200000).toISOString(),
  },
];

export async function fetchConnectedAccounts(userToken?: string): Promise<ConnectedAccount[]> {
  try {
    const endpoint = `${SUPABASE_URL}/functions/v1/sync-external-transactions`;
    const token = userToken || 'demo-token-123';

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action: 'list_accounts' }),
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.accounts) && data.accounts.length > 0) {
        return data.accounts;
      }
    }
  } catch (err) {
    console.warn('Edge sync fetch failed, checking local storage:', err);
  }

  // Local storage fallback
  try {
    const saved = await AsyncStorage.getItem(CONNECTED_ACCOUNTS_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
    await AsyncStorage.setItem(CONNECTED_ACCOUNTS_KEY, JSON.stringify(DEFAULT_ACCOUNTS));
    return DEFAULT_ACCOUNTS;
  } catch {
    return DEFAULT_ACCOUNTS;
  }
}

export async function linkBankAccount(
  institutionName: string,
  userToken?: string
): Promise<ConnectedAccount> {
  const newAccount: ConnectedAccount = {
    id: `acc_${Date.now()}`,
    provider: 'sandbox',
    institution_name: institutionName,
    account_name: `${institutionName} Account`,
    account_mask: Math.floor(1000 + Math.random() * 9000).toString(),
    account_type: institutionName.includes('Card') ? 'credit' : 'checking',
    balance: Math.round((1200 + Math.random() * 4000) * 100) / 100,
    currency: 'USD',
    status: 'active',
    last_synced_at: new Date().toISOString(),
  };

  try {
    const endpoint = `${SUPABASE_URL}/functions/v1/sync-external-transactions`;
    const token = userToken || 'demo-token-123';

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        action: 'link_account',
        institutionName,
        accountName: newAccount.account_name,
        accountType: newAccount.account_type,
        mask: newAccount.account_mask,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.account) {
        return data.account;
      }
    }
  } catch (err) {
    console.warn('Edge link failed, persisting locally:', err);
  }

  // Persist locally
  try {
    const existing = await fetchConnectedAccounts(userToken);
    const updated = [newAccount, ...existing.filter((a) => a.id !== newAccount.id)];
    await AsyncStorage.setItem(CONNECTED_ACCOUNTS_KEY, JSON.stringify(updated));
  } catch {}

  return newAccount;
}

export async function syncBankTransactions(
  accountId?: string,
  institutionName?: string,
  userToken?: string
): Promise<ExternalSyncResult> {
  try {
    const endpoint = `${SUPABASE_URL}/functions/v1/sync-external-transactions`;
    const token = userToken || 'demo-token-123';

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        action: 'sync_transactions',
        accountId,
        institutionName: institutionName || 'Chase Sapphire Preferred',
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && typeof data.importedCount === 'number') {
        return data as ExternalSyncResult;
      }
    }
  } catch (err) {
    console.warn('Edge sync call failed, using local simulation:', err);
  }

  // Local fallback simulation
  const inst = institutionName || 'Chase Sapphire Preferred';
  const today = new Date().toISOString().split('T')[0];
  let sampleTransactions = [
    { external_id: `ext_${Date.now()}_1`, amount: 26.50, description: 'Chipotle Mexican Grill', category: 'Food', date: today, merchant: 'Chipotle' },
    { external_id: `ext_${Date.now()}_2`, amount: 19.80, description: 'Uber Trip San Francisco', category: 'Transport', date: today, merchant: 'Uber' },
    { external_id: `ext_${Date.now()}_3`, amount: 64.20, description: 'Trader Joe’s Market', category: 'Food', date: today, merchant: 'Trader Joe’s' },
  ];

  if (inst.toLowerCase().includes('gcash')) {
    sampleTransactions = [
      { external_id: `ext_gcash_netflix_${today}`, amount: 9.99, description: 'Netflix Monthly Subscription via GCash', category: 'Entertainment', date: today, merchant: 'Netflix' },
      { external_id: `ext_gcash_foodpanda_${today}`, amount: 14.50, description: 'Foodpanda Delivery Order', category: 'Food', date: today, merchant: 'Foodpanda' },
      { external_id: `ext_gcash_spotify_${today}`, amount: 4.99, description: 'Spotify Premium Family Auto-Debit', category: 'Entertainment', date: today, merchant: 'Spotify' },
      { external_id: `ext_gcash_grab_${today}`, amount: 6.80, description: 'GrabCar Metro Ride', category: 'Transport', date: today, merchant: 'Grab' },
    ];
  } else if (inst.toLowerCase().includes('paypal')) {
    sampleTransactions = [
      { external_id: `ext_paypal_netflix_${today}`, amount: 19.99, description: 'Netflix.com Streaming Bill', category: 'Entertainment', date: today, merchant: 'Netflix' },
      { external_id: `ext_paypal_chatgpt_${today}`, amount: 20.00, description: 'OpenAI ChatGPT Plus Subscription', category: 'Bills', date: today, merchant: 'OpenAI' },
      { external_id: `ext_paypal_uber_${today}`, amount: 22.40, description: 'Uber Technologies Ride', category: 'Transport', date: today, merchant: 'Uber' },
    ];
  } else if (inst.toLowerCase().includes('maya')) {
    sampleTransactions = [
      { external_id: `ext_maya_shopee_${today}`, amount: 18.50, description: 'Shopee Online Checkout', category: 'Shopping', date: today, merchant: 'Shopee' },
      { external_id: `ext_maya_bills_${today}`, amount: 42.00, description: 'Electric Power Bill Payment', category: 'Bills', date: today, merchant: 'Utility' },
    ];
  }

  return {
    importedCount: sampleTransactions.length,
    skippedDuplicates: 0,
    accountName: inst,
    source: 'local-simulation-engine',
    latestTransactions: sampleTransactions,
  };
}

export async function disconnectBankAccount(
  accountId: string,
  userToken?: string
): Promise<boolean> {
  try {
    const endpoint = `${SUPABASE_URL}/functions/v1/sync-external-transactions`;
    const token = userToken || 'demo-token-123';

    await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action: 'disconnect_account', accountId }),
    });
  } catch {}

  try {
    const existing = await fetchConnectedAccounts(userToken);
    const filtered = existing.filter((a) => a.id !== accountId);
    await AsyncStorage.setItem(CONNECTED_ACCOUNTS_KEY, JSON.stringify(filtered));
  } catch {}

  return true;
}
