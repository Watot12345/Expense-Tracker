-- Migration: Single-roundtrip Financial Health RPC with composite indexing

-- 1. Create partial index on active subscriptions for fast burn and renewal lookups
create index if not exists idx_subs_active_billing 
  on subscriptions(user_id, next_billing_date) 
  where status = 'active';

-- 2. Indexes on income and expenses for fast date-based rollups
create index if not exists idx_income_user_date 
  on income(user_id, income_date);

create index if not exists idx_expenses_user_date 
  on expenses(user_id, expense_date);

-- 3. Core get_user_financial_health RPC function
create or replace function get_user_financial_health(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  -- Security check: Enforce that authenticated users can only query their own financial health
  if auth.role() = 'authenticated' and auth.uid() is not null and auth.uid() <> p_user_id then
    raise exception 'Unauthorized access to user financial health data';
  end if;

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
                     where user_id = p_user_id and (expense_date = current_date or date_trunc('day', created_at) = date_trunc('day', now()))),
    'upcoming_renewals', (select coalesce(jsonb_agg(jsonb_build_object(
        'name', name, 'amount', amount, 'next_billing_date', next_billing_date
      )), '[]'::jsonb) from subscriptions
      where user_id = p_user_id and status = 'active'
      and next_billing_date <= current_date + interval '2 days')
  ) into result;

  return result;
end;
$$;

-- Grant execution to authenticated users and service_role
grant execute on function get_user_financial_health(uuid) to authenticated;
grant execute on function get_user_financial_health(uuid) to service_role;
grant execute on function get_user_financial_health(uuid) to anon;
