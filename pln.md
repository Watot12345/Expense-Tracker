# Execution Prompt: PennyFlow — Gemini AI Integration & Scale-Prep

## Context
PennyFlow is an Expo Router + TypeScript + NativeWind app with Supabase backend. It already has: expense/income tracking, subscriptions tracker, daily safe-to-spend dial, paginated transaction feed, and a local `PennyAI.parseExpense()` natural-language parser running client-side. This phase moves AI processing server-side via Supabase Edge Functions and adds receipt scanning, voice entry, and a financial advisor chat — with hard security and correctness guardrails. Do not bundle any AI API key in the client. Do not let the model perform financial arithmetic that determines user-facing affordability decisions — the server computes that, the model only explains it.

## Objective
Implement in this exact order. Each step must be working and manually verified before starting the next.

1. Edge Function gateway + `ai-parse-transaction` (replace client-side parser)
2. `ai-scan-receipt` + `ReceiptScannerModal.tsx`
3. `get_user_financial_health` Postgres RPC
4. `ai-financial-advisor` with hard-coded guardrail math
5. Push notification worker + price-creep/zombie detector (requires `price_history` table)
6. Only if Step 3's RPC fails a <40ms benchmark under load: add Redis/Upstash caching and `expenses` table partitioning

---

## Step 1: Edge Function Gateway + Transaction Parser

### Setup
- Create `supabase/functions/_shared/auth.ts`: verify JWT from `Authorization` header, extract `user_id`, reject if invalid.
- Create `supabase/functions/_shared/rateLimit.ts`: simple per-user rate limiter (e.g. max 30 requests/min), backed by a `rate_limits` table or Supabase KV if available.
- Store Gemini API key as a Supabase Edge Function secret (`supabase secrets set GEMINI_API_KEY=...`), never in client `.env` or `app.json`.

### `supabase/functions/ai-parse-transaction/index.ts`
- Accepts `{ text: string }`, authenticated via `_shared/auth.ts`, rate-limited via `_shared/rateLimit.ts`.
- Calls Gemini `gemini-3.5-flash-lite` with a strict JSON schema response:
```typescript
type ParsedTransaction = {
  amount: number;
  merchant: string;
  category: 'Food' | 'Transport' | 'Bills' | 'Shopping' | 'Entertainment' | 'Health' | 'Other';
  description: string;
  is_recurring: boolean;
  suggested_cycle?: 'monthly' | 'yearly' | 'weekly';
}[];
```
- Returns array (input text may describe multiple transactions).
- On Gemini error or malformed JSON, return a typed error response the client can fall back to manual entry on — never crash silently.

### Client changes
- Update `lib/pennyAI.ts` to call this Edge Function instead of parsing locally. Keep a lightweight local regex fallback ONLY for offline/network-failure cases (amount + first-word category guess), clearly marked as degraded mode in the UI.

### Acceptance Criteria
- Unauthenticated requests to the function return 401.
- Exceeding rate limit returns 429 with a clear message.
- `"Lunch $18 at Chipotle and parking $6"` returns 2 correctly separated transaction objects.
- Network failure gracefully falls back to local parse with a visible "offline mode" indicator, not a crash.

---

## Step 2: Receipt Scanning

### Storage decision (build this in, don't skip)
- Create private Supabase Storage bucket `receipts`, path pattern `receipts/{user_id}/{expense_id}.jpg`.
- Set a 30-day lifecycle/expiry policy on the bucket (auto-delete) — balances audit/dispute usefulness against storage cost. Do not store indefinitely, do not discard immediately.

### `supabase/functions/ai-scan-receipt/index.ts`
- Accepts base64 image, authenticated + rate-limited same as Step 1.
- Calls `gemini-3.7-flash` multimodal, extracts: vendor, total, tax, currency, date, itemized sub-items.
- Detects subscription-like receipts (SaaS invoice, gym membership, app store recurring charge patterns) and returns an `is_likely_subscription: boolean` flag.
- Uploads the image to the `receipts` bucket only after successful extraction (don't store failed/garbage scans).

### `components/ReceiptScannerModal.tsx`
- `expo-image-picker` camera + gallery picker.
- Scanning loader state while awaiting Edge Function response.
- Pre-filled review modal: merchant, total, category badge, itemized list — user must confirm before it saves to `expenses`.
- If `is_likely_subscription` is true, show a prompt: "Add as recurring subscription?" linking into the existing Subscription add flow from the prior phase.

### Acceptance Criteria
- Scanning a real photographed receipt populates correct merchant/total/category in the review modal.
- User can edit any field before confirming save.
- Subscription-like receipts trigger the subscription prompt; regular receipts don't.
- Image only persists in storage after a successful, user-confirmed save.

---

## Step 3: Financial Health RPC

### `supabase/migrations/[timestamp]_financial_health_rpc.sql`
```sql
create or replace function get_user_financial_health(p_user_id uuid)
returns jsonb
language plpgsql
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'balance', (select coalesce(sum(amount),0) from income where user_id = p_user_id)
             - (select coalesce(sum(amount),0) from expenses where user_id = p_user_id),
    'monthly_income', (select coalesce(sum(amount),0) from income
                        where user_id = p_user_id and date_trunc('month', income_date) = date_trunc('month', now())),
    'monthly_subscription_burn', (select coalesce(sum(
        case billing_cycle
          when 'yearly' then amount / 12
          when 'weekly' then amount * 4.33
          else amount
        end
      ),0) from subscriptions where user_id = p_user_id and status = 'active'),
    'today_spent', (select coalesce(sum(amount),0) from expenses
                     where user_id = p_user_id and expense_date = current_date),
    'upcoming_renewals', (select coalesce(jsonb_agg(jsonb_build_object(
        'name', name, 'amount', amount, 'next_billing_date', next_billing_date
      )), '[]'::jsonb) from subscriptions
      where user_id = p_user_id and status = 'active'
      and next_billing_date <= current_date + interval '2 days')
  ) into result;
  return result;
end;
$$;
```
- Add partial index if not already present from prior phase: `idx_subs_active_billing on subscriptions(user_id, next_billing_date) where status = 'active'`.

### Client changes
- Replace the 4 separate queries currently powering the Safe-to-Spend dial and balance card with a single call to this RPC.

### Acceptance Criteria
- RPC returns correct values matching manual calculation for a test user with mixed subscription cycles.
- Client dashboard load drops from 4 round-trips to 1 (verify in network inspector).
- Benchmark: run RPC under 500 simulated concurrent calls, confirm <40ms average. If it fails, proceed to Step 6; if it passes, skip Step 6 for now.

---

## Step 4: Financial Advisor (Guardrailed)

### Critical guardrail — read before implementing
The model must NEVER be the source of truth for whether the user can afford something. The server computes the boolean/number first; Gemini only explains it in natural language. This prevents hallucinated affordability claims.

### `supabase/functions/ai-financial-advisor/index.ts`
- Accepts `{ question: string }`, authenticated + rate-limited.
- Server-side, BEFORE calling Gemini:
  1. Call `get_user_financial_health(user_id)`.
  2. If the question matches a detectable affordability pattern (contains a dollar amount + "afford"/"can I spend"/similar), compute the actual answer server-side: `requested_amount <= (balance - upcoming_committed_subscriptions - emergency_buffer)`.
  3. Pass the computed facts (balance, safe-to-spend, upcoming renewals, computed affordability boolean if applicable) into the Gemini prompt as grounding context, with an explicit instruction: "Only use the numbers provided below. Do not estimate, assume, or invent any financial figures."
- Call `gemini-3.7-flash` with that grounded context + the user's question, temperature low (favor determinism over creativity for financial answers).

### `components/AIFinancialCoachSheet.tsx`
- Floating sheet on Stats tab, quick prompt pills for common questions.
- Renders advisor response as chat bubble; if a computed affordability boolean was involved, visually highlight the actual number (not just the model's prose) so the user sees the ground-truth figure, not just an AI claim.

### Acceptance Criteria
- Asking "Can I afford a $450 flight this Friday?" returns an answer consistent with the server-computed boolean, not a model guess.
- Asking "Can I spend $50,000 today?" is correctly refused/flagged as unaffordable based on real balance, every time (test 5+ times for consistency).
- Response always cites the actual balance/safe-to-spend numbers, never invented figures.

---

## Step 5: Push Notifications + Zombie Detector

### Prerequisite: price history
Add `previous_amount` column to `subscriptions`, updated whenever `amount` is edited, OR a separate `subscription_price_history` table logging every change with timestamp. Choose the simpler column approach unless you need full history.

### Worker (`supabase/functions/daily-radar-worker/index.ts` + cron)
- Scheduled via `pg_cron` or GitHub Actions, runs per-user at their local 08:00 (requires storing user timezone on `profiles`, add column if missing).
- Calls `get_user_financial_health(user_id)`, builds message: safe-to-spend today + any subscriptions renewing within 48h.
- Sends via Expo Push Service (`expo-server-sdk`), using push tokens stored in a `push_tokens` table (register on app launch via `expo-notifications`).

### Zombie/price-creep detector (bi-weekly cron)
- Flags subscriptions where `amount != previous_amount` (price creep).
- Flags subscriptions with `status = 'active'` and no status change in 60+ days as "review these."
- Surface both as an in-app notification + list on the Subscriptions tab, with 1-tap cancel-email-draft generator (compose a cancellation email template, open in device mail client).

### Acceptance Criteria
- Push notification arrives at correct local time with accurate safe-to-spend figure.
- Editing a subscription amount correctly triggers a price-creep flag on next scan.
- Zombie detector correctly identifies untouched 60+ day subscriptions in a test dataset.

---

## Step 6 (conditional — only if Step 3 benchmark fails)

### Redis/Upstash caching
- Cache `get_user_financial_health` result per user, 5-minute TTL.
- Invalidate immediately (not wait for TTL) on: `addExpense`, `deleteExpense`, subscription add/edit/delete, income add/edit.

### `expenses` partitioning
- Only if row count approaching 100k+. Migrate to monthly range partitions on `expense_date`. Write migration as a reversible step with a rollback script — this is a higher-risk schema change, test on a staging copy first.

---

## General Constraints
- Every Edge Function: JWT-authenticated, rate-limited, typed request/response, no API keys in client.
- TypeScript strict mode throughout.
- Test each step's acceptance criteria before starting the next — no parallel building across steps.
- Any financial number shown to the user must be traceable to a server-computed value, never a raw model output.

## Deliverable Format
For each step: migration SQL (if any), full file contents for new/modified files, and a manual test checklist confirming that step's acceptance criteria.