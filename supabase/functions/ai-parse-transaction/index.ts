import { corsHeaders } from '../_shared/cors.ts';
import { authenticateUser } from '../_shared/auth.ts';
import { checkRateLimit } from '../_shared/rateLimit.ts';

export interface ParsedTransaction {
  amount: number;
  merchant: string;
  category: 'Food' | 'Transport' | 'Bills' | 'Shopping' | 'Entertainment' | 'Health' | 'Other';
  description: string;
  is_recurring: boolean;
  suggested_cycle?: 'monthly' | 'yearly' | 'weekly';
}

const PARSE_PROMPT = `
You are an expert financial transaction parser for PennyFlow.
Analyze the user's natural language spending description and extract all distinct transactions into a structured JSON array.
If multiple items are described (e.g. "Lunch $18 at Chipotle and parking $6"), output each as a separate item in the array.
Infer whether an expense is recurring (subscriptions, bills, memberships) and suggest the billing cycle if recurring.

Valid categories:
- Food (restaurants, groceries, cafes, delivery)
- Transport (rideshare, gas, subway, parking, tolls)
- Bills (utilities, phone, rent, internet, recurring software)
- Shopping (clothing, electronics, Amazon, home goods)
- Entertainment (movies, games, streaming, events)
- Health (pharmacy, gym, doctor, fitness)
- Other (anything else)
`;

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // 1. Authenticate JWT
  const { userId, error: authError } = await authenticateUser(req);
  if (authError || !userId) {
    return new Response(
      JSON.stringify({ error: authError || 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // 2. Check Rate Limit (30 requests/min)
  const rateCheck = checkRateLimit(userId, 30, 60 * 1000);
  if (!rateCheck.allowed) {
    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded. Please wait before parsing more transactions.',
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
    const text = typeof body?.text === 'string' ? body.text.trim() : '';

    if (!text) {
      return new Response(
        JSON.stringify({ error: 'Text prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      // Fallback parser if API key is not yet configured in environment
      const fallback = localHeuristicParse(text);
      return new Response(
        JSON.stringify({ transactions: fallback, source: 'heuristic-fallback' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Call Gemini 3.5 Flash Lite with structured schema
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`;
    const payload = {
      system_instruction: {
        parts: [{ text: PARSE_PROMPT }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: `Parse this spending description: "${text}"` }],
        },
      ],
      generationConfig: {
        response_mime_type: 'application/json',
        response_schema: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              amount: { type: 'NUMBER' },
              merchant: { type: 'STRING' },
              category: {
                type: 'STRING',
                enum: ['Food', 'Transport', 'Bills', 'Shopping', 'Entertainment', 'Health', 'Other'],
              },
              description: { type: 'STRING' },
              is_recurring: { type: 'BOOLEAN' },
              suggested_cycle: {
                type: 'STRING',
                enum: ['monthly', 'yearly', 'weekly'],
              },
            },
            required: ['amount', 'merchant', 'category', 'description', 'is_recurring'],
          },
        },
        temperature: 0.1,
      },
    };

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini API error:', errText);
      const fallback = localHeuristicParse(text);
      return new Response(
        JSON.stringify({ transactions: fallback, source: 'fallback-after-gemini-error' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resJson = await response.json();
    const candidateText = resJson?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
      throw new Error('No candidate content returned from Gemini');
    }

    const parsed: ParsedTransaction[] = JSON.parse(candidateText);

    return new Response(
      JSON.stringify({ transactions: parsed, source: 'gemini-3.5-flash-lite' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('ai-parse-transaction error:', err);
    return new Response(
      JSON.stringify({
        error: err.message || 'Failed to parse transaction',
        transactions: [],
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Robust regex fallback for multi-item phrases when Gemini is offline.
 * Handles patterns like "Lunch $18 at Chipotle and parking $6".
 */
function localHeuristicParse(text: string): ParsedTransaction[] {
  const segments = text.split(/\s+(?:and|also|plus|\&|\+)\s+/i);
  const results: ParsedTransaction[] = [];

  for (const seg of segments) {
    const amtMatch = seg.match(/(?:\$|£|€|¥)?\s*(\d+(?:\.\d{1,2})?)/);
    const amount = amtMatch ? parseFloat(amtMatch[1]) : 0;

    let category: ParsedTransaction['category'] = 'Other';
    const lower = seg.toLowerCase();
    if (/food|lunch|dinner|breakfast|burger|pizza|coffee|cafe|chipotle|starbucks|grocery/i.test(lower)) {
      category = 'Food';
    } else if (/parking|uber|lyft|gas|fuel|metro|transit|subway|taxi|bus/i.test(lower)) {
      category = 'Transport';
    } else if (/netflix|spotify|subscription|bill|internet|phone|wifi/i.test(lower)) {
      category = 'Bills';
    } else if (/shop|amazon|clothes|shoes/i.test(lower)) {
      category = 'Shopping';
    } else if (/movie|game|steam|ticket/i.test(lower)) {
      category = 'Entertainment';
    } else if (/gym|pharmacy|medicine|doctor/i.test(lower)) {
      category = 'Health';
    }

    const atMatch = seg.match(/\b(?:at|from|to|in)\s+([A-Za-z0-9\s']+)/i);
    const merchant = atMatch ? atMatch[1].trim() : category;

    if (amount > 0) {
      results.push({
        amount,
        merchant,
        category,
        description: seg.trim(),
        is_recurring: /subscription|monthly|membership/i.test(lower),
        suggested_cycle: /yearly|annual/i.test(lower) ? 'yearly' : 'monthly',
      });
    }
  }

  if (results.length === 0) {
    results.push({
      amount: 0,
      merchant: 'Unknown',
      category: 'Other',
      description: text,
      is_recurring: false,
    });
  }

  return results;
}
