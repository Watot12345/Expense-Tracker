import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const stripeApiKey = Deno.env.get('STRIPE_SECRET_KEY');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

  if (!stripeApiKey || !webhookSecret) {
    return new Response(JSON.stringify({ error: 'Stripe webhook secrets not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return new Response(JSON.stringify({ error: 'Missing stripe signature header' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const rawBody = await req.text();
    const { default: Stripe } = await import('npm:stripe@^14');
    const stripe = new Stripe(stripeApiKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Record<string, any>;
        const userId = session.client_reference_id || session.metadata?.userId;
        const tier = session.metadata?.tier || 'monthly';
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (userId) {
          const expiresAt = new Date();
          if (tier === 'annual') {
            expiresAt.setFullYear(expiresAt.getFullYear() + 1);
          } else {
            expiresAt.setMonth(expiresAt.getMonth() + 1);
          }

          await supabaseAdmin
            .from('profiles')
            .update({
              is_pro: true,
              pro_tier: tier,
              pro_expires_at: expiresAt.toISOString(),
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
            })
            .eq('id', userId);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Record<string, any>;
        const customerId = subscription.customer as string;

        if (customerId) {
          await supabaseAdmin
            .from('profiles')
            .update({
              is_pro: false,
              pro_tier: 'free',
              pro_expires_at: new Date().toISOString(),
            })
            .eq('stripe_customer_id', customerId);
        }
        break;
      }

      default:
        console.log(`Unhandled Stripe event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Webhook signature failure';
    return new Response(JSON.stringify({ error: errorMsg }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
