export interface SafeToSpendInput {
  monthlyIncome: number;
  monthlySubscriptionBurn: number;
  monthlySavingsGoalTarget: number;
  daysRemainingInMonth?: number;
  todaySpendSoFar?: number;
}

export interface SafeToSpendResult {
  dailySafeToSpend: number; // Remaining allowance for today specifically
  baseDailyAllowance: number; // Daily discretionary budget before today's spend
  discretionaryIncome: number; // Monthly income minus fixed subscriptions and savings targets
  monthlyIncome: number;
  monthlySubscriptionBurn: number;
  monthlySavingsGoalTarget: number;
  daysRemainingInMonth: number;
  todaySpendSoFar: number;
  status: 'healthy' | 'tight' | 'overspent';
  isZeroIncome: boolean;
}

/**
 * Computes the remaining days in the current month (inclusive of today).
 */
export function getDaysRemainingInMonth(): number {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  // Total days in current month
  const totalDays = new Date(year, month + 1, 0).getDate();
  const today = now.getDate();
  return Math.max(1, totalDays - today + 1);
}

/**
 * Calculates the Daily Safe-to-Spend allowance and status breakdown.
 * Formula:
 *   discretionary = monthlyIncome - monthlySubscriptionBurn - monthlySavingsGoalTarget
 *   baseDailyAllowance = discretionary / daysRemainingInMonth
 *   dailySafeToSpend = baseDailyAllowance - todaySpendSoFar
 */
export function calculateSafeToSpend({
  monthlyIncome,
  monthlySubscriptionBurn,
  monthlySavingsGoalTarget,
  daysRemainingInMonth,
  todaySpendSoFar = 0,
}: SafeToSpendInput): SafeToSpendResult {
  const daysLeft = daysRemainingInMonth ?? getDaysRemainingInMonth();
  const isZeroIncome = !monthlyIncome || monthlyIncome <= 0;

  // Fallback if zero income: treat discretionary as 0
  const income = Math.max(0, monthlyIncome);
  const subBurn = Math.max(0, monthlySubscriptionBurn);
  const savingsTarget = Math.max(0, monthlySavingsGoalTarget);

  const discretionaryIncome = income - subBurn - savingsTarget;
  const baseDailyAllowance = isZeroIncome ? 0 : discretionaryIncome / Math.max(1, daysLeft);
  const dailySafeToSpend = baseDailyAllowance - todaySpendSoFar;

  let status: 'healthy' | 'tight' | 'overspent' = 'healthy';
  if (dailySafeToSpend < 0) {
    status = 'overspent';
  } else if (baseDailyAllowance > 0 && dailySafeToSpend < baseDailyAllowance * 0.2) {
    // Under 20% of base daily budget left
    status = 'tight';
  }

  return {
    dailySafeToSpend,
    baseDailyAllowance,
    discretionaryIncome,
    monthlyIncome: income,
    monthlySubscriptionBurn: subBurn,
    monthlySavingsGoalTarget: savingsTarget,
    daysRemainingInMonth: daysLeft,
    todaySpendSoFar,
    status,
    isZeroIncome,
  };
}
