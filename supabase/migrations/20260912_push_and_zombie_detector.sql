-- Migration: Subscriptions Price History, Push Tokens & Zombie Detector

-- 1. Add price history and status tracking columns to subscriptions
alter table subscriptions add column if not exists previous_amount numeric;
alter table subscriptions add column if not exists last_status_change_at timestamptz default now();

-- 2. Add timezone column to profiles
alter table profiles add column if not exists timezone text default 'UTC';

-- 3. Trigger to track price changes and status updates automatically
create or replace function handle_subscription_updates()
returns trigger
language plpgsql
as $$
begin
  if (TG_OP = 'UPDATE') then
    -- Record previous amount on price changes
    if (OLD.amount is distinct from NEW.amount) then
      NEW.previous_amount := OLD.amount;
    end if;

    -- Record status update timestamp
    if (OLD.status is distinct from NEW.status) then
      NEW.last_status_change_at := now();
    end if;
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_subscription_updates on subscriptions;
create trigger trg_subscription_updates
  before update on subscriptions
  for each row
  execute function handle_subscription_updates();

-- 4. Push Tokens table for daily radar notifications
create table if not exists push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  token text not null,
  platform text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, token)
);

-- Enable RLS
alter table push_tokens enable row level security;

create policy "Users can manage their own push tokens"
  on push_tokens for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 5. RPC to query zombie and price-creep subscriptions
create or replace function get_zombie_subscriptions(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', id,
      'name', name,
      'amount', amount,
      'previous_amount', previous_amount,
      'billing_cycle', billing_cycle,
      'category', category,
      'last_status_change_at', last_status_change_at,
      'is_price_creep', (previous_amount is not null and previous_amount <> amount),
      'is_zombie', (status = 'active' and last_status_change_at < now() - interval '60 days')
    )), '[]'::jsonb)
    from subscriptions
    where user_id = p_user_id
      and (
        (previous_amount is not null and previous_amount <> amount)
        or (status = 'active' and last_status_change_at < now() - interval '60 days')
      )
  );
end;
$$;

grant execute on function get_zombie_subscriptions(uuid) to authenticated;
grant execute on function get_zombie_subscriptions(uuid) to service_role;
grant execute on function get_zombie_subscriptions(uuid) to anon;
