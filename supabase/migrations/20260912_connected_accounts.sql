-- Migration: Connected Bank & Spending App Accounts with Idempotent Ingestion

-- 1. Create connected_accounts table
create table if not exists connected_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  provider text not null default 'plaid', -- 'plaid', 'teller', 'openbanking', 'sandbox'
  institution_name text not null,
  institution_logo text,
  account_name text not null,
  account_mask text, -- e.g. '4242'
  account_type text check (account_type in ('checking', 'savings', 'credit', 'other')) default 'checking',
  balance numeric default 0,
  currency text default 'USD',
  sync_cursor text,
  last_synced_at timestamptz,
  status text check (status in ('active', 'error', 'disconnected')) default 'active',
  created_at timestamptz default now()
);

-- Index for fast user account lookups
create index if not exists idx_connected_accounts_user 
  on connected_accounts(user_id, status);

-- Enable Row Level Security
alter table connected_accounts enable row level security;

create policy "Users can view their own connected accounts"
  on connected_accounts for select
  using (auth.uid() = user_id);

create policy "Users can insert their own connected accounts"
  on connected_accounts for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own connected accounts"
  on connected_accounts for update
  using (auth.uid() = user_id);

create policy "Users can delete their own connected accounts"
  on connected_accounts for delete
  using (auth.uid() = user_id);

-- 2. Add external_id and account_id to expenses for idempotent deduplication
alter table expenses add column if not exists external_id text;
alter table expenses add column if not exists account_id uuid references connected_accounts(id) on delete set null;

-- Unique partial index: Guarantees zero duplicate transactions across multiple sync cycles
create unique index if not exists idx_expenses_user_external_id 
  on expenses(user_id, external_id) 
  where external_id is not null;
