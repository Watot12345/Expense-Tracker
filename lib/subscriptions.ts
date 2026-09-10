import { Subscription } from '@/types/subscription';

/**
 * Returns active subscriptions renewing within the next `days` (default 7),
 * sorted ascending by next_billing_date.
 */
export function getUpcomingRenewals(subscriptions: Subscription[], days: number = 7): Subscription[] {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const horizon = new Date(now);
  horizon.setDate(horizon.getDate() + days);

  return subscriptions
    .filter((sub) => {
      if (sub.status !== 'active') return false;
      const billingDate = new Date(sub.next_billing_date);
      billingDate.setHours(0, 0, 0, 0);
      return billingDate >= now && billingDate <= horizon;
    })
    .sort((a, b) => new Date(a.next_billing_date).getTime() - new Date(b.next_billing_date).getTime());
}

/**
 * Calculates normalized monthly-equivalent commitment for all active subscriptions.
 * - yearly: amount / 12
 * - weekly: amount * 4.33
 * - monthly: amount
 */
export function getMonthlyBurn(subscriptions: Subscription[]): number {
  return subscriptions
    .filter((sub) => sub.status === 'active')
    .reduce((sum, sub) => {
      const amt = Number(sub.amount) || 0;
      if (sub.billing_cycle === 'yearly') {
        return sum + amt / 12;
      }
      if (sub.billing_cycle === 'weekly') {
        return sum + amt * 4.33;
      }
      return sum + amt;
    }, 0);
}

/**
 * Advances a subscription's next_billing_date forward by one billing cycle.
 * Returns the updated subscription object and the matching expense payload to record.
 */
export function advanceBillingDate(subscription: Subscription): {
  updatedSubscription: Subscription;
  expensePayload: {
    amount: number;
    description: string;
    expense_date: string;
  };
} {
  const currentDate = new Date(subscription.next_billing_date);
  const nextDate = new Date(currentDate);

  switch (subscription.billing_cycle) {
    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'monthly':
    default:
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
  }

  const updatedSubscription: Subscription = {
    ...subscription,
    next_billing_date: nextDate.toISOString().split('T')[0],
  };

  const expensePayload = {
    amount: subscription.amount,
    description: `${subscription.name} (${subscription.billing_cycle} subscription)`,
    expense_date: new Date().toISOString(),
  };

  return { updatedSubscription, expensePayload };
}

/**
 * Flags active subscriptions whose created_at is older than thresholdDays (default 60).
 */
export function flagStaleSubscriptions(
  subscriptions: Subscription[],
  thresholdDays: number = 60
): Subscription[] {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - thresholdDays);

  return subscriptions.filter((sub) => {
    if (!sub.created_at || sub.status !== 'active') return false;
    const createdAt = new Date(sub.created_at);
    return createdAt <= threshold;
  });
}
