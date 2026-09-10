import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { supabase } from './supabase';
export type {
  ProTier,
  UserEntitlements,
  PricingPlan,
  AffiliateOffer,
  CheckoutSessionResponse,
} from '@/types/billing';
import {
  ProTier,
  UserEntitlements,
  PricingPlan,
  AffiliateOffer,
  CheckoutSessionResponse,
} from '@/types/billing';
import { UserProfile } from '@/types/expense';

export const PRO_STORAGE_KEY = 'penny_pro_status';

export const FREE_LIMITS = {
  RECEIPT_SCANS: 5,
  COACH_QUERIES: 3,
  CONNECTED_BANKS: 1,
};

export const PRICING_PLANS: Record<'annual' | 'monthly', PricingPlan> = {
  annual: {
    id: 'annual',
    name: 'Pro Annual',
    price: 59.99,
    interval: 'year',
    pricePerMonth: 4.99,
    savingsBadge: 'SAVE 40% (BEST VALUE)',
    features: [
      'Unlimited Gemini Vision Receipt Scans',
      'Unlimited AI Financial Advisor & Affordability Audits',
      'Unlimited Bank & Spending App Syncs',
      'Zombie Subscription Radar & Price Creep Detector',
      'Accountant-Ready Tax & CSV Deduction Packs',
      'Priority Support & Cloud Auto-Sync',
    ],
  },
  monthly: {
    id: 'monthly',
    name: 'Pro Monthly',
    price: 6.99,
    interval: 'month',
    pricePerMonth: 6.99,
    features: [
      'Unlimited Gemini Vision Receipt Scans',
      'Unlimited AI Financial Advisor & Affordability Audits',
      'Unlimited Bank & Spending App Syncs',
      'Zombie Subscription Radar & Price Creep Detector',
      'Accountant-Ready Tax & CSV Deduction Packs',
    ],
  },
};

export const AFFILIATE_OFFERS: AffiliateOffer[] = [
  {
    id: 'amex_gold',
    title: 'American Express Gold Card',
    institution: 'American Express',
    category: 'credit_card',
    badge: 'TOP DINING PICK',
    highlight: '4X Points on Dining & Groceries',
    description: 'Earn 60,000 Membership Rewards points after spending $6,000 in your first 6 months. Ideal for food & dining expenses.',
    payoutEstimate: '$150/approved signup',
    ctaText: 'Apply & Earn 60k Pts',
    url: 'https://americanexpress.com',
    color: '#006FCF',
    icon: 'CreditCard',
  },
  {
    id: 'chase_sapphire',
    title: 'Chase Sapphire Preferred',
    institution: 'Chase Bank',
    category: 'credit_card',
    badge: 'BEST TRAVEL VALUE',
    highlight: '60,000 Bonus Points ($750 Travel Value)',
    description: 'Earn 3x on dining, 2x on travel, and $50 annual hotel credit. Transfer 1:1 to leading airline & hotel partners.',
    payoutEstimate: '$100/approved signup',
    ctaText: 'View Chase Offer',
    url: 'https://chase.com',
    color: '#1170CF',
    icon: 'CreditCard',
  },
  {
    id: 'high_yield_savings',
    title: 'High-Yield Cash Account (4.50% APY)',
    institution: 'Top Financial Partners',
    category: 'savings',
    badge: 'GROW YOUR CASH',
    highlight: '4.50% Annual Yield • Zero Fees',
    description: 'Earn over 10x the national average on your emergency fund. FDIC insured up to $5,000,000 with unlimited instant transfers.',
    payoutEstimate: '$50/funded account',
    ctaText: 'Start Earning 4.5% APY',
    url: 'https://wealthfront.com',
    color: '#10B981',
    icon: 'TrendingUp',
  },
];

/**
 * Computes user entitlements based on Pro status and free limits
 */
export function computeEntitlements(
  profile: UserProfile | null,
  scansUsed: number = 0,
  coachQueriesUsed: number = 0,
  connectedBanksCount: number = 0
): UserEntitlements {
  const isPro = !!(profile?.is_pro);
  const tier: ProTier = (profile?.pro_tier as ProTier) || (isPro ? 'annual' : 'free');

  return {
    is_pro: isPro,
    tier,
    expires_at: profile?.pro_expires_at || null,
    scans_used: scansUsed,
    scans_remaining: isPro ? 999999 : Math.max(0, FREE_LIMITS.RECEIPT_SCANS - scansUsed),
    coach_queries_used: coachQueriesUsed,
    coach_queries_remaining: isPro ? 999999 : Math.max(0, FREE_LIMITS.COACH_QUERIES - coachQueriesUsed),
    can_sync_unlimited_banks: isPro || connectedBanksCount < FREE_LIMITS.CONNECTED_BANKS,
    can_access_zombie_radar: isPro,
  };
}

/**
 * Initiates checkout via Edge Function or provides instant sandbox upgrade
 */
export async function startProCheckout(
  tier: 'monthly' | 'annual',
  userToken?: string
): Promise<CheckoutSessionResponse> {
  try {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
    if (supabaseUrl && userToken) {
      const response = await fetch(`${supabaseUrl}/functions/v1/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({ tier }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.url) {
          // Open Stripe Checkout in device browser
          await Linking.openURL(data.url);
          return { success: true, url: data.url, isSandbox: false };
        }
        if (data.isSandbox) {
          return { success: true, isSandbox: true, message: data.message };
        }
      }
    }
  } catch (err) {
    console.warn('Checkout function fallback triggered:', err);
  }

  // Local sandbox fallback for offline or development testing
  return {
    success: true,
    isSandbox: true,
    message: 'Developer Sandbox: Upgraded to PennyFlow Pro locally.',
  };
}
