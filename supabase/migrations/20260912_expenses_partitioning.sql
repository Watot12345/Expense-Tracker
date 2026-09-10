-- Migration: Reversible Monthly Range Partitioning for expenses
-- Step 6 (Scale-Prep): Ready to apply when expenses row count approaches 100k+

-- ==============================================================================
-- ROLLBACK SCRIPT (Keep for emergency reversal):
-- ==============================================================================
-- BEGIN;
--   -- 1. Create flat table from partitioned table
--   CREATE TABLE expenses_flat AS SELECT * FROM expenses_partitioned;
--   -- 2. Drop partitioned table
--   DROP TABLE expenses_partitioned CASCADE;
--   -- 3. Restore original table name
--   ALTER TABLE expenses_flat RENAME TO expenses;
--   -- 4. Re-enable indexes and RLS
--   ALTER TABLE expenses ADD PRIMARY KEY (id);
--   CREATE INDEX idx_expenses_user_date ON expenses(user_id, expense_date);
--   ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
-- COMMIT;
-- ==============================================================================

-- 1. Create parent partitioned table partitioned by expense_date range
create table if not exists expenses_partitioned (
  id uuid default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  amount numeric not null,
  category_id uuid,
  description text,
  expense_date date not null default current_date,
  receipt_url text,
  created_at timestamptz default now(),
  primary key (id, expense_date)
) partition by range (expense_date);

-- 2. Create monthly partition tables for Year 2026
create table if not exists expenses_y2026m01 partition of expenses_partitioned
  for values from ('2026-01-01') to ('2026-02-01');
create table if not exists expenses_y2026m02 partition of expenses_partitioned
  for values from ('2026-02-01') to ('2026-03-01');
create table if not exists expenses_y2026m03 partition of expenses_partitioned
  for values from ('2026-03-01') to ('2026-04-01');
create table if not exists expenses_y2026m04 partition of expenses_partitioned
  for values from ('2026-04-01') to ('2026-05-01');
create table if not exists expenses_y2026m05 partition of expenses_partitioned
  for values from ('2026-05-01') to ('2026-06-01');
create table if not exists expenses_y2026m06 partition of expenses_partitioned
  for values from ('2026-06-01') to ('2026-07-01');
create table if not exists expenses_y2026m07 partition of expenses_partitioned
  for values from ('2026-07-01') to ('2026-08-01');
create table if not exists expenses_y2026m08 partition of expenses_partitioned
  for values from ('2026-08-01') to ('2026-09-01');
create table if not exists expenses_y2026m09 partition of expenses_partitioned
  for values from ('2026-09-01') to ('2026-10-01');
create table if not exists expenses_y2026m10 partition of expenses_partitioned
  for values from ('2026-10-01') to ('2026-11-01');
create table if not exists expenses_y2026m11 partition of expenses_partitioned
  for values from ('2026-11-01') to ('2026-12-01');
create table if not exists expenses_y2026m12 partition of expenses_partitioned
  for values from ('2026-12-01') to ('2027-01-01');

-- Default partition for dates outside 2026
create table if not exists expenses_default partition of expenses_partitioned default;

-- 3. Composite index on partitioned table
create index if not exists idx_expenses_part_user_date on expenses_partitioned (user_id, expense_date);

-- 4. Enable Row Level Security
alter table expenses_partitioned enable row level security;

create policy "Users can manage their own partitioned expenses"
  on expenses_partitioned for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
