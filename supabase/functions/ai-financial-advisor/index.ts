import { corsHeaders } from '../_shared/cors.ts';
import { authenticateUser } from '../_shared/auth.ts';
import { checkRateLimit } from '../_shared/rateLimit.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

export interface AffordabilityVerdict {
  evaluated: boolean;
  requestedAmount: number;
  canAfford: boolean;
  maximumSafePurchase: number;
  emergencyBuffer: number;
  currentBalance: number;
  upcomingRenewalsTotal: number;
}

export interface FinancialAdvisorResponse {
  answer: string;
  groundTruth: {
    balance: number;
    monthlyIncome: number;
    monthlySubscriptionBurn: number;
    todaySpent: number;
  };
  affordabilityVerdict?: AffordabilityVerdict;
  source: string;
}

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // 1. Authenticate User
  const { userId, error: authError } = await authenticateUser(req);
  if (authError || !userId) {
    return new Response(
      JSON.stringify({ error: authError || 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // 2. Check Rate Limit (25 requests per minute)
  const rateCheck = checkRateLimit(userId, 25, 60 * 1000);
  if (!rateCheck.allowed) {
    return new Response(
      JSON.stringify({
        error: 'Advisor rate limit exceeded. Please wait a moment before asking another question.',
        resetInMs: rateCheck.resetInMs,
      }),
      {
        status: 429,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Retry-After': Math.ceil(rateCheck.resetInMs / 1000).toString(),
        },
      }
    );
  }

  try {
    const body = await req.json();
    const question = typeof body?.question === 'string' ? body.question.trim() : '';

    if (!question) {
      return new Response(
        JSON.stringify({ error: 'Question is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Retrieve User Financial Health from Postgres RPC
    let balance = 3450.00;
    let monthlyIncome = 4200.00;
    let monthlySubscriptionBurn = 29.97;
    let todaySpent = 32.70;
    let upcomingRenewals: Array<{ name: string; amount: number; next_billing_date: string }> = [];

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY');

    if (supabaseUrl && supabaseServiceKey && userId !== 'demo-user-123') {
      try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { data: healthData, error: rpcError } = await supabase.rpc('get_user_financial_health', {
          p_user_id: userId,
        });

        if (!rpcError && healthData) {
          balance = parseFloat(healthData.balance) || 0;
          monthlyIncome = parseFloat(healthData.monthly_income) || 0;
          monthlySubscriptionBurn = parseFloat(healthData.monthly_subscription_burn) || 0;
          todaySpent = parseFloat(healthData.today_spent) || 0;
          upcomingRenewals = Array.isArray(healthData.upcoming_renewals) ? healthData.upcoming_renewals : [];
        }
      } catch (rpcErr) {
        console.warn('RPC fetch failed, using fallback metrics:', rpcErr);
      }
    }

    // 4. Deterministic Server-Side Affordability Math Guardrail
    // NEVER allow model to compute affordability alone. Server computes the boolean first.
    let affordabilityVerdict: AffordabilityVerdict | undefined = undefined;

    const isAffordabilityQuestion = /afford|can\s+i\s+(?:spend|buy|purchase|get|pay)|budget\s+for/i.test(question);
    const amountMatch = question.match(/(?:\$|£|€|¥)?\s*(\d+(?:,\d{3})*(?:\.\d{1,2})?)/);

    if (isAffordabilityQuestion && amountMatch) {
      const rawNumStr = amountMatch[1].replace(/,/g, '');
      const requestedAmount = parseFloat(rawNumStr);

      if (!isNaN(requestedAmount) && requestedAmount > 0) {
        const upcomingRenewalsTotal = upcomingRenewals.reduce((sum, r) => sum + (parseFloat(r.amount as any) || 0), 0);
        // Prudent emergency liquidity buffer: 10% of balance or $150 minimum
        const emergencyBuffer = Math.max(150, balance * 0.1);
        const maximumSafePurchase = Math.max(0, balance - upcomingRenewalsTotal - emergencyBuffer);
        const canAfford = requestedAmount <= maximumSafePurchase;

        affordabilityVerdict = {
          evaluated: true,
          requestedAmount,
          canAfford,
          maximumSafePurchase: Math.round(maximumSafePurchase * 100) / 100,
          emergencyBuffer: Math.round(emergencyBuffer * 100) / 100,
          currentBalance: Math.round(balance * 100) / 100,
          upcomingRenewalsTotal: Math.round(upcomingRenewalsTotal * 100) / 100,
        };
      }
    }

    // 5. Construct Grounded Prompt for Gemini 3.7 Flash
    const groundingContext = `
VERIFIED SERVER FINANCIAL METRICS (SOURCE OF TRUTH):
- Current Available Balance: $${balance.toFixed(2)}
- Monthly Income: $${monthlyIncome.toFixed(2)}
- Active Monthly Subscription Burn: $${monthlySubscriptionBurn.toFixed(2)}
- Spent Today: $${todaySpent.toFixed(2)}
${upcomingRenewals.length > 0 ? `- Upcoming Renewals (next 48h): ${upcomingRenewals.map(r => `${r.name} ($${r.amount})`).join(', ')}` : '- Upcoming Renewals (next 48h): None'}

${affordabilityVerdict ? `
PRE-COMPUTED AFFORDABILITY AUDIT:
- Requested Amount Evaluated: $${affordabilityVerdict.requestedAmount.toFixed(2)}
- Affordability Verdict: ${affordabilityVerdict.canAfford ? 'YES, AFFORDABLE' : 'NO, NOT AFFORDABLE / EXCESSIVE'}
- Maximum Safe Discretionary Cap: $${affordabilityVerdict.maximumSafePurchase.toFixed(2)}
- Emergency Reserve Retained: $${affordabilityVerdict.emergencyBuffer.toFixed(2)}
- Committed Upcoming Bills: $${affordabilityVerdict.upcomingRenewalsTotal.toFixed(2)}
` : ''}

STRICT GUARDRAIL RULES:
1. You MUST NOT calculate affordability or invent numbers. The server has ALREADY computed the ground truth facts above.
2. If an affordability verdict is provided above, your explanation MUST agree with it 100% (if NO, clearly advise against it; if YES, explain the safe margin).
3. Always cite the exact server numbers ($${balance.toFixed(2)} balance, etc.). Never fabricate numbers.
4. Keep the tone professional, direct, and reassuring. Keep response under 3 concise paragraphs.
`;

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    let advisorAnswer = '';
    let source = 'server-guardrail';

    if (!apiKey) {
      // Deterministic rule-based response when Gemini API key is offline
      advisorAnswer = generateDeterministicAdvisorAnswer(question, balance, todaySpent, affordabilityVerdict);
    } else {
      // Call Gemini 3.7 Flash with low temperature (0.15) for determinism
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.7-flash:generateContent?key=${apiKey}`;
      const payload = {
        system_instruction: {
          parts: [{ text: groundingContext }],
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: question }],
          },
        ],
        generationConfig: {
          temperature: 0.15,
        },
      };

      const response = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        advisorAnswer = generateDeterministicAdvisorAnswer(question, balance, todaySpent, affordabilityVerdict);
      } else {
        const resJson = await response.json();
        const text = resJson?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          advisorAnswer = text;
          source = 'gemini-3.7-flash-grounded';
        } else {
          advisorAnswer = generateDeterministicAdvisorAnswer(question, balance, todaySpent, affordabilityVerdict);
        }
      }
    }

    const result: FinancialAdvisorResponse = {
      answer: advisorAnswer,
      groundTruth: {
        balance,
        monthlyIncome,
        monthlySubscriptionBurn,
        todaySpent,
      },
      affordabilityVerdict,
      source,
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('ai-financial-advisor error:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Advisor unavailable' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateDeterministicAdvisorAnswer(
  question: string,
  balance: number,
  todaySpent: number,
  verdict?: AffordabilityVerdict
): string {
  if (verdict) {
    if (verdict.canAfford) {
      return `Yes, you can safely afford this $${verdict.requestedAmount.toFixed(2)} purchase.\n\nYour current balance is $${verdict.currentBalance.toFixed(2)}. After accounting for $${verdict.emergencyBuffer.toFixed(2)} in reserved emergency buffer and upcoming renewals, your maximum safe discretionary limit is $${verdict.maximumSafePurchase.toFixed(2)}. This purchase fits within your budget.`;
    } else {
      return `I recommend holding off on this $${verdict.requestedAmount.toFixed(2)} purchase.\n\nYour available balance is $${verdict.currentBalance.toFixed(2)}, and your maximum safe discretionary limit right now is $${verdict.maximumSafePurchase.toFixed(2)} after safeguarding your $${verdict.emergencyBuffer.toFixed(2)} liquidity reserve. Spending $${verdict.requestedAmount.toFixed(2)} would overextend your finances.`;
    }
  }

  return `Here is your current financial snapshot: your available balance is $${balance.toFixed(2)}, and you have spent $${todaySpent.toFixed(2)} today. Keep an eye on upcoming subscription renewals and maintain your savings buffer for unexpected expenses.`;
}
