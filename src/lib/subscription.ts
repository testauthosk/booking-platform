import prisma from '@/lib/prisma';

export type Plan = 'free' | 'pro' | 'business';

export interface PlanLimits {
  maxMasters: number;
  maxServices: number;
  customBot: boolean;
  analytics: boolean;
  googleBusiness: boolean;
  emailCampaigns: boolean;
  prioritySupport: boolean;
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    maxMasters: 3,
    maxServices: 15,
    customBot: false,
    analytics: false,
    googleBusiness: false,
    emailCampaigns: false,
    prioritySupport: false,
  },
  pro: {
    maxMasters: 10,
    maxServices: 50,
    customBot: true,
    analytics: true,
    googleBusiness: false,
    emailCampaigns: false,
    prioritySupport: false,
  },
  business: {
    maxMasters: 999,
    maxServices: 999,
    customBot: true,
    analytics: true,
    googleBusiness: true,
    emailCampaigns: true,
    prioritySupport: true,
  },
};

export const PLAN_PRICES: Record<Plan, number> = {
  free: 0,
  pro: 299,
  business: 499,
};

export const PLAN_NAMES: Record<Plan, string> = {
  free: 'Free',
  pro: 'Pro',
  business: 'Business',
};

/**
 * Get current plan for a salon.
 * Returns 'free' if no subscription exists.
 */
export async function getSalonPlan(salonId: string): Promise<Plan> {
  const sub = await prisma.subscription.findUnique({
    where: { salonId },
    select: { plan: true, status: true, currentPeriodEnd: true },
  });

  if (!sub) return 'free';
  if (sub.status !== 'active') return 'free';
  if (sub.currentPeriodEnd && sub.currentPeriodEnd < new Date()) return 'free';

  return sub.plan as Plan;
}

/**
 * Get plan limits for a salon.
 */
export async function getSalonLimits(salonId: string): Promise<PlanLimits> {
  const plan = await getSalonPlan(salonId);
  return PLAN_LIMITS[plan];
}

/**
 * Check if salon has access to a premium feature.
 */
export async function hasFeature(salonId: string, feature: keyof PlanLimits): Promise<boolean> {
  const limits = await getSalonLimits(salonId);
  const value = limits[feature];
  return typeof value === 'boolean' ? value : true;
}

/**
 * Get bot token for salon (custom if paid, default otherwise).
 */
export async function getBotToken(salonId: string): Promise<string> {
  const salon = await prisma.salon.findUnique({
    where: { id: salonId },
    select: { customBotToken: true },
  });

  if (salon?.customBotToken) {
    return salon.customBotToken;
  }

  return process.env.TELEGRAM_BOT_TOKEN || '';
}
