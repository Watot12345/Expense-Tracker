-- Migration: Create subscriptions table with Row Level Security
create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  amount numeric not null,
  billing_cycle text check (billing_cycle in ('monthly','yearly','weekly')) not null,
  next_billing_date date not null,
  category text,
  icon text,
  color text,
  status text check (status in ('active','paused','to_cancel')) default 'active',
  created_at timestamptz default now()
);

create index if not exists idx_subscriptions_user on subscriptions(user_id, next_billing_date);

-- Enable RLS
alter table subscriptions enable row level security;

-- Policies for authenticated users
create policy "Users can view their own subscriptions"
  on subscriptions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own subscriptions"
  on subscriptions for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own subscriptions"
  on subscriptions for update
  using (auth.uid() = user_id);

create policy "Users can delete their own subscriptions"
  on subscriptions for delete
  using (auth.uid() = user_id);
