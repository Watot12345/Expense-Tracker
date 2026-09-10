-- Migration: PennyFlow Monetization, Pro Subscriptions & Entitlements

-- 1. Add Pro subscription & usage fields to profiles
alter table profiles add column if not exists is_pro boolean default false;
alter table profiles add column if not exists pro_tier text check (pro_tier in ('free', 'monthly', 'annual', 'lifetime')) default 'free';
alter table profiles add column if not exists pro_expires_at timestamptz;
alter table profiles add column if not exists stripe_customer_id text;
alter table profiles add column if not exists stripe_subscription_id text;
alter table profiles add column if not exists receipt_scans_count int default 0;
alter table profiles add column if not exists ai_coach_queries_count int default 0;

-- 2. Index for fast entitlement checks
create index if not exists idx_profiles_pro_status 
  on profiles(id, is_pro, pro_expires_at);

-- 3. Entitlements RPC: Fast, single-query permission & limit check
create or replace function get_user_entitlements(p_user_id uuid)
returns json
language plpgsql
security definer
as $$
declare
  v_is_pro boolean := false;
  v_tier text := 'free';
  v_expires_at timestamptz;
  v_receipt_count int := 0;
  v_coach_count int := 0;
  v_result json;
begin
  select 
    coalesce(is_pro, false),
    coalesce(pro_tier, 'free'),
    pro_expires_at,
    coalesce(receipt_scans_count, 0),
    coalesce(ai_coach_queries_count, 0)
  into
    v_is_pro,
    v_tier,
    v_expires_at,
    v_receipt_count,
    v_coach_count
  from profiles
  where id = p_user_id;

  -- Auto-expire pro if expiration date has passed
  if v_is_pro and v_expires_at is not null and v_expires_at < now() then
    v_is_pro := false;
    v_tier := 'free';
    update profiles set is_pro = false, pro_tier = 'free' where id = p_user_id;
  end if;

  v_result := json_build_object(
    'is_pro', v_is_pro,
    'tier', v_tier,
    'expires_at', v_expires_at,
    'scans_used', v_receipt_count,
    'scans_remaining', case when v_is_pro then 999999 else greatest(0, 5 - v_receipt_count) end,
    'coach_queries_used', v_coach_count,
    'coach_queries_remaining', case when v_is_pro then 999999 else greatest(0, 5 - v_coach_count) end,
    'can_sync_unlimited_banks', v_is_pro,
    'can_access_zombie_radar', v_is_pro
  );

  return v_result;
end;
$$;
