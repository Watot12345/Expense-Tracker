export type ProTier = 'free' | 'monthly' | 'annual' | 'lifetime';

export interface UserEntitlements {
  is_pro: boolean;
  tier: ProTier;
  expires_at?: string | null;
  scans_used: number;
  scans_remaining: number;
  coach_queries_used: number;
  coach_queries_remaining: number;
  can_sync_unlimited_banks: boolean;
  can_access_zombie_radar: boolean;
}

export interface PricingPlan {
  id: 'monthly' | 'annual';
  name: string;
  price: number;
  interval: 'month' | 'year';
  pricePerMonth: number;
  savingsBadge?: string;
  features: string[];
}

export interface AffiliateOffer {
  id: string;
  title: string;
  institution: string;
  category: 'credit_card' | 'savings' | 'investment';
  badge: string;
  highlight: string;
  description: string;
  payoutEstimate: string; // Dev referral commission
  ctaText: string;
  url: string;
  color: string;
  icon: string;
}

export interface CheckoutSessionResponse {
  success: boolean;
  url?: string;
  isSandbox?: boolean;
  message?: string;
  error?: string;
}
