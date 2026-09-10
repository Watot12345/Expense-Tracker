import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceKey) {
    return new Response(
      JSON.stringify({ error: 'Supabase credentials unconfigured for worker' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    // 1. Fetch all users with registered push tokens
    const { data: tokenRecords, error: tokenError } = await supabase
      .from('push_tokens')
      .select('user_id, token');

    if (tokenError) {
      throw tokenError;
    }

    if (!tokenRecords || tokenRecords.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No registered push tokens found', sent: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Group tokens by user_id
    const userTokensMap: Record<string, string[]> = {};
    for (const record of tokenRecords) {
      if (!userTokensMap[record.user_id]) {
        userTokensMap[record.user_id] = [];
      }
      userTokensMap[record.user_id].push(record.token);
    }

    const pushMessages: Array<{
      to: string;
      title: string;
      body: string;
      sound: string;
      data: Record<string, any>;
    }> = [];

    // 2. Compute radar metrics for each user
    for (const [userId, tokens] of Object.entries(userTokensMap)) {
      const { data: health } = await supabase.rpc('get_user_financial_health', {
        p_user_id: userId,
      });

      if (!health) continue;

      const balance = parseFloat(health.balance) || 0;
      const subBurn = parseFloat(health.monthly_subscription_burn) || 0;
      const todaySpent = parseFloat(health.today_spent) || 0;
      const renewals: Array<{ name: string; amount: number; next_billing_date: string }> = Array.isArray(health.upcoming_renewals)
        ? health.upcoming_renewals
        : [];

      // Calculate approximate safe daily spend for notification
      const daysInMonth = 30;
      const dayOfMonth = new Date().getDate();
      const remainingDays = Math.max(1, daysInMonth - dayOfMonth);
      const safeDailySpend = Math.max(0, (balance - subBurn) / remainingDays - todaySpent);

      let bodyText = `Safe to spend today: $${safeDailySpend.toFixed(2)}.`;
      if (renewals.length > 0) {
        bodyText += ` ⚠️ ${renewals.map(r => `${r.name} ($${r.amount})`).join(', ')} renewing within 48h!`;
      }

      for (const token of tokens) {
        pushMessages.push({
          to: token,
          title: 'PennyFlow Daily Radar ⚡',
          body: bodyText,
          sound: 'default',
          data: {
            screen: 'subscriptions',
            renewalsCount: renewals.length,
          },
        });
      }
    }

    // 3. Send batches to Expo Push Service API
    let sentCount = 0;
    if (pushMessages.length > 0) {
      const expoPushUrl = 'https://exp.host/--/api/v2/push/send';
      const pushResponse = await fetch(expoPushUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        body: JSON.stringify(pushMessages),
      });

      if (pushResponse.ok) {
        sentCount = pushMessages.length;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        usersProcessed: Object.keys(userTokensMap).length,
        notificationsDispatched: sentCount,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('daily-radar-worker error:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Worker execution failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
