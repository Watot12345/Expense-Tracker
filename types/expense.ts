export const CATEGORIES = [
  'Food',
  'Transport',
  'Bills',
  'Shopping',
  'Entertainment',
  'Health',
  'Other',
] as const;

export type ExpenseCategory = typeof CATEGORIES[number];

export interface Category {
  id: string | number;
  name: string;
  icon?: string;
  color?: string;
  user_id?: string;
}

export interface Expense {
  id: string;
  amount: number;
  category_id?: string | number | null;
  description?: string | null;
  expense_date?: string;
  receipt_url?: string | null;
  external_id?: string | null;
  account_id?: string | null;
  created_at?: string;
  user_id?: string;
  categories?: {
    name?: string;
    icon?: string;
    color?: string;
  } | null;
}

export interface Goal {
  id: string;
  title: string;
  target: number;
  current: number;
  target_date?: string | null;
  icon?: string;
  created_at?: string;
}

export interface Income {
  id: string;
  amount: number;
  source: string;
  frequency?: string;
  income_date?: string;
  user_id?: string;
  created_at?: string;
}

export interface UserProfile {
  id: string;
  full_name?: string | null;
  currency?: string;
  monthly_budget?: number;
  is_pro?: boolean;
  pro_tier?: 'free' | 'monthly' | 'annual' | 'lifetime';
  pro_expires_at?: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  receipt_scans_count?: number;
  ai_coach_queries_count?: number;
}

export * from './subscription';
export * from './account';
export * from './billing';

