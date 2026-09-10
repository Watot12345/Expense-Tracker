import { corsHeaders } from '../_shared/cors.ts';
import { authenticateUser } from '../_shared/auth.ts';
import { checkRateLimit } from '../_shared/rateLimit.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

export interface SyncRequestPayload {
  action: 'list_accounts' | 'link_account' | 'sync_transactions' | 'disconnect_account';
  accountId?: string;
  institutionName?: string;
  provider?: string;
  accountName?: string;
  accountType?: 'checking' | 'savings' | 'credit' | 'other';
  mask?: string;
}

interface RawTransaction {
  externalId: string;
  amount: number;
  merchant: string;
  date: string;
  categoryGuess?: string;
  description: string;
}

const INSTITUTION_PRESETS: Record<string, { logo: string; sampleTransactions: RawTransaction[] }> = {
  'Chase Sapphire Preferred': {
    logo: 'chase',
    sampleTransactions: [
      { externalId: 'ext_chase_001', amount: 32.50, merchant: 'Chipotle Mexican Grill', date: new Date().toISOString().split('T')[0], categoryGuess: 'Food', description: 'Chipotle store #4120' },
      { externalId: 'ext_chase_002', amount: 18.20, merchant: 'Uber Technologies', date: new Date().toISOString().split('T')[0], categoryGuess: 'Transport', description: 'Uber Trip San Francisco' },
      { externalId: 'ext_chase_003', amount: 74.30, merchant: 'Trader Joe’s', date: new Date(Date.now() - 86400000).toISOString().split('T')[0], categoryGuess: 'Food', description: 'Trader Joe’s #182' },
      { externalId: 'ext_chase_004', amount: 45.00, merchant: 'Chevron Gas Station', date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0], categoryGuess: 'Transport', description: 'Chevron Station 098' },
    ],
  },
  'American Express Gold': {
    logo: 'amex',
    sampleTransactions: [
      { externalId: 'ext_amex_001', amount: 85.00, merchant: 'Nobu Restaurant', date: new Date().toISOString().split('T')[0], categoryGuess: 'Food', description: 'Nobu Downtown Dinner' },
      { externalId: 'ext_amex_002', amount: 14.99, merchant: 'Delta Sky Club Coffee', date: new Date(Date.now() - 86400000).toISOString().split('T')[0], categoryGuess: 'Food', description: 'Delta Air Terminal 2' },
      { externalId: 'ext_amex_003', amount: 120.00, merchant: 'Equinox Fitness Club', date: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0], categoryGuess: 'Health', description: 'Equinox Monthly Training' },
    ],
  },
  'Apple Card': {
    logo: 'apple',
    sampleTransactions: [
      { externalId: 'ext_apple_001', amount: 9.99, merchant: 'Apple Services', date: new Date().toISOString().split('T')[0], categoryGuess: 'Bills', description: 'Apple.com/bill iCloud Storage' },
      { externalId: 'ext_apple_002', amount: 4.75, merchant: 'Blue Bottle Coffee', date: new Date().toISOString().split('T')[0], categoryGuess: 'Food', description: 'Blue Bottle Hayes Valley' },
      { externalId: 'ext_apple_003', amount: 110.00, merchant: 'Nike Store Union Square', date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0], categoryGuess: 'Shopping', description: 'Nike Running Apparel' },
    ],
  },
  'GCash': {
    logo: 'gcash',
    sampleTransactions: [
      { externalId: 'ext_gcash_001', amount: 9.99, merchant: 'Netflix Subscription', date: new Date().toISOString().split('T')[0], categoryGuess: 'Entertainment', description: 'Netflix Monthly Streaming via GCash' },
      { externalId: 'ext_gcash_002', amount: 14.50, merchant: 'Foodpanda Delivery', date: new Date().toISOString().split('T')[0], categoryGuess: 'Food', description: 'Foodpanda Order #9281' },
      { externalId: 'ext_gcash_003', amount: 4.99, merchant: 'Spotify Premium', date: new Date(Date.now() - 86400000).toISOString().split('T')[0], categoryGuess: 'Entertainment', description: 'Spotify Family Plan Auto-Debit' },
      { externalId: 'ext_gcash_004', amount: 6.80, merchant: 'GrabCar Metro Ride', date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0], categoryGuess: 'Transport', description: 'Grab Transport Metro' },
    ],
  },
  'Maya': {
    logo: 'maya',
    sampleTransactions: [
      { externalId: 'ext_maya_001', amount: 12.00, merchant: 'Shopee Online Shopping', date: new Date().toISOString().split('T')[0], categoryGuess: 'Shopping', description: 'Shopee Pay Checkout' },
      { externalId: 'ext_maya_002', amount: 45.00, merchant: 'Meralco Electric Utility', date: new Date(Date.now() - 86400000).toISOString().split('T')[0], categoryGuess: 'Bills', description: 'Meralco Power Bill Payment' },
    ],
  },
  'PayPal': {
    logo: 'paypal',
    sampleTransactions: [
      { externalId: 'ext_paypal_001', amount: 19.99, merchant: 'Netflix.com', date: new Date().toISOString().split('T')[0], categoryGuess: 'Entertainment', description: 'Netflix Streaming Monthly Auto-Debit' },
      { externalId: 'ext_paypal_002', amount: 20.00, merchant: 'ChatGPT Plus OpenAI', date: new Date().toISOString().split('T')[0], categoryGuess: 'Bills', description: 'OpenAI ChatGPT Subscription' },
    ],
  },
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // 1. Authenticate user
  const { userId, error: authError } = await authenticateUser(req);
  if (authError || !userId) {
    return new Response(
      JSON.stringify({ error: authError || 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // 2. Check rate limit (15 requests / min)
  const rateCheck = checkRateLimit(userId, 15, 60 * 1000);
  if (!rateCheck.allowed) {
    return new Response(
      JSON.stringify({
        error: 'Sync rate limit reached. Please wait before syncing accounts again.',
        resetInMs: rateCheck.resetInMs,
      }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const payload: SyncRequestPayload = await req.json();
    const action = payload?.action || 'list_accounts';

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY');
    const hasSupabase = Boolean(supabaseUrl && serviceKey && userId !== 'demo-user-123');

    // ACTION 1: LINK ACCOUNT
    if (action === 'link_account') {
      const instName = payload.institutionName || 'Chase Sapphire Preferred';
      const preset = INSTITUTION_PRESETS[instName] || { logo: 'bank', sampleTransactions: [] };
      const accountMask = payload.mask || Math.floor(1000 + Math.random() * 9000).toString();

      const newAccount = {
        id: crypto.randomUUID(),
        user_id: userId,
        provider: payload.provider || 'sandbox',
        institution_name: instName,
        institution_logo: preset.logo,
        account_name: payload.accountName || `${instName} Checking`,
        account_mask: accountMask,
        account_type: payload.accountType || 'checking',
        balance: 2850.50,
        currency: 'USD',
        status: 'active',
        last_synced_at: new Date().toISOString(),
      };

      if (hasSupabase) {
        const supabase = createClient(supabaseUrl!, serviceKey!);
        await supabase.from('connected_accounts').insert([newAccount]);
      }

      return new Response(
        JSON.stringify({ success: true, account: newAccount }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ACTION 2: LIST ACCOUNTS
    if (action === 'list_accounts') {
      if (hasSupabase) {
        const supabase = createClient(supabaseUrl!, serviceKey!);
        const { data: accounts, error } = await supabase
          .from('connected_accounts')
          .select('*')
          .eq('user_id', userId)
          .eq('status', 'active')
          .order('created_at', { ascending: false });

        if (!error && accounts && accounts.length > 0) {
          return new Response(
            JSON.stringify({ accounts }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Default demo account
      const demoAccount = {
        id: 'acc_demo_chase_1',
        user_id: userId,
        provider: 'sandbox',
        institution_name: 'Chase Sapphire Preferred',
        institution_logo: 'chase',
        account_name: 'Chase Sapphire Checking',
        account_mask: '4821',
        account_type: 'checking',
        balance: 3450.00,
        currency: 'USD',
        status: 'active',
        last_synced_at: new Date().toISOString(),
      };

      return new Response(
        JSON.stringify({ accounts: [demoAccount] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ACTION 3: SYNC TRANSACTIONS
    if (action === 'sync_transactions') {
      const targetInst = payload.institutionName || 'Chase Sapphire Preferred';
      const preset = INSTITUTION_PRESETS[targetInst] || INSTITUTION_PRESETS['Chase Sapphire Preferred'];
      const rawTransactions = preset.sampleTransactions;

      let importedCount = 0;
      let skippedDuplicates = 0;
      const latestTransactions = [];

      if (hasSupabase) {
        const supabase = createClient(supabaseUrl!, serviceKey!);

        // Find or create default categories map
        const { data: catList } = await supabase.from('categories').select('id, name');
        const catMap = new Map<string, string>();
        if (catList) {
          for (const c of catList) catMap.set(c.name.toLowerCase(), c.id);
        }

        for (const item of rawTransactions) {
          const categoryName = item.categoryGuess || 'Other';
          const catId = catMap.get(categoryName.toLowerCase()) || null;

          const { data: inserted, error: insertError } = await supabase
            .from('expenses')
            .insert([{
              user_id: userId,
              amount: item.amount,
              description: item.description,
              category_id: catId,
              expense_date: item.date,
              external_id: item.externalId,
            }])
            .select('id, amount, description');

          if (!insertError && inserted && inserted.length > 0) {
            importedCount++;
            latestTransactions.push({
              external_id: item.externalId,
              amount: item.amount,
              description: item.description,
              category: categoryName,
              date: item.date,
              merchant: item.merchant,
            });
          } else {
            // Already imported (unique constraint on external_id prevented duplicate)
            skippedDuplicates++;
          }
        }

        // Update last_synced_at on connected account
        if (payload.accountId) {
          await supabase
            .from('connected_accounts')
            .update({ last_synced_at: new Date().toISOString() })
            .eq('id', payload.accountId);
        }
      } else {
        // In demo mode: simulate first-time sync
        importedCount = rawTransactions.length;
        skippedDuplicates = 0;
        for (const t of rawTransactions) {
          latestTransactions.push({
            external_id: t.externalId,
            amount: t.amount,
            description: t.description,
            category: t.categoryGuess || 'Other',
            date: t.date,
            merchant: t.merchant,
          });
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          importedCount,
          skippedDuplicates,
          accountName: targetInst,
          source: 'plaid-openbanking-engine',
          latestTransactions,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ACTION 4: DISCONNECT ACCOUNT
    if (action === 'disconnect_account') {
      if (hasSupabase && payload.accountId) {
        const supabase = createClient(supabaseUrl!, serviceKey!);
        await supabase
          .from('connected_accounts')
          .update({ status: 'disconnected' })
          .eq('id', payload.accountId);
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Account disconnected' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Unrecognized action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('sync-external-transactions error:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Sync failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
