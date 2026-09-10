export interface Subscription {
  id: string;
  user_id?: string;
  name: string;
  amount: number;
  previous_amount?: number | null;
  billing_cycle: 'monthly' | 'yearly' | 'weekly';
  next_billing_date: string;
  category: string;
  icon?: string;
  color?: string;
  status: 'active' | 'paused' | 'to_cancel';
  last_status_change_at?: string | null;
  created_at?: string;
}
