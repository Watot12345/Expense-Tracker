-- Migration: Composite index on expenses for high-speed paginated queries
create index if not exists idx_expenses_user_date on expenses(user_id, expense_date desc);
