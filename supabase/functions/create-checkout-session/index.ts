import { corsHeaders } from '../_shared/cors.ts';
import { authenticateUser } from '../_shared/auth.ts';
import { checkRateLimit } from '../_shared/rateLimit.ts';

export interface CreateCheckoutPayload {
  tier: 'monthly' | 'annual';
  successUrl?: string;
  cancelUrl?: string;
}

const PRICING_CONFIG = {
  monthly: {
    amount: 699, // $6.99 in cents
    currency: 'usd',
    name: 'PennyFlow Pro — Monthly',
    interval: 'month' as const,
  },
  annual: {
    amount: 5999, // $59.99 in cents ($4.99/mo)
    currency: 'usd',
    name: 'PennyFlow Pro — Annual (Save 40%)',
    interval: 'year' as const,
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

  // 1. Authenticate Supabase JWT
  const { userId, error: authError } = await authenticateUser(req);
  if (authError || !userId) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized', details: authError }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // 2. Rate limit check (max 10 checkout attempts/min)
  const rateLimit = checkRateLimit(userId, 10, 60000);
  if (!rateLimit.allowed) {
    return new Response(
      JSON.stringify({ error: 'Too many checkout requests. Please wait.' }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body: CreateCheckoutPayload = await req.json();
    const tier = body.tier === 'annual' ? 'annual' : 'monthly';
    const plan = PRICING_CONFIG[tier];

    const stripeApiKey = Deno.env.get('STRIPE_SECRET_KEY');

    // If Stripe API key is configured in Supabase Secrets, create live Stripe Checkout Session
    if (stripeApiKey && stripeApiKey.startsWith('sk_')) {
      // Dynamic import of Stripe in Deno serverless environment
      const { default: Stripe } = await import('npm:stripe@^14');
      const stripe = new Stripe(stripeApiKey, {
        apiVersion: '2023-10-16',
        httpClient: Stripe.createFetchHttpClient(),
      });

      const origin = req.headers.get('origin') || 'https://pennyflow.app';
      const successUrl = body.successUrl || `${origin}?session_id={CHECKOUT_SESSION_ID}&pro_success=true`;
      const cancelUrl = body.cancelUrl || `${origin}?pro_canceled=true`;

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'subscription',
        client_reference_id: userId,
        line_items: [
          {
            price_data: {
              currency: plan.currency,
              product_data: {
                name: plan.name,
                description: 'Unlock unlimited Gemini receipt scans, AI coach, and bank syncing.',
              },
              unit_amount: plan.amount,
              recurring: {
                interval: plan.interval,
              },
            },
            quantity: 1,
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          userId,
          tier,
        },
      });

      return new Response(
        JSON.stringify({
          success: true,
          url: session.url,
          sessionId: session.id,
          isSandbox: false,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Otherwise, return sandbox developer mock checkout response
    return new Response(
      JSON.stringify({
        success: true,
        isSandbox: true,
        tier,
        message: 'Stripe Sandbox Mode: Ready for immediate developer upgrade simulation.',
        simulatedPlan: plan,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown checkout error';
    return new Response(
      JSON.stringify({ error: errorMsg }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
