import { Plan, UserProfile } from '../types';

export const PLAN_LIMITS = {
  FREE: 20,
  PRO: 100,
  PLUS: 300,
  ELITE: 1000,
  OWNER: 999999
};

export const PLAN_PRICING = {
  FREE: { monthly: 0, yearly: 0 },
  PRO: { monthly: 2.99, yearly: 28.70 },
  PLUS: { monthly: 5.99, yearly: 57.50 },
  ELITE: { monthly: 10.99, yearly: 105.50 },
  OWNER: { monthly: 0, yearly: 0 }
};

export const PLAN_FEATURES = {
  FREE: {
    speed: 'Slow',
    memory: 'Limited',
    ads: true,
    codeGen: false,
    imageGen: false
  },
  PRO: {
    speed: 'Medium',
    memory: 'Standard',
    ads: false,
    codeGen: true,
    imageGen: true // Basic
  },
  PLUS: {
    speed: 'Priority',
    memory: 'Extended',
    ads: false,
    codeGen: true,
    imageGen: true
  },
  ELITE: {
    speed: 'Fastest',
    memory: 'Full',
    ads: false,
    codeGen: true,
    imageGen: true
  },
  OWNER: {
    speed: 'Fastest',
    memory: 'Full',
    ads: false,
    codeGen: true,
    imageGen: true
  }
};

export function checkUsageLimit(user: UserProfile): boolean {
  if (!user) return false;
  if (user.role === 'owner' || user.plan === 'OWNER') return true;
  const limit = PLAN_LIMITS[user.plan] || PLAN_LIMITS.FREE;
  const usage = user.dailyUsage || 0;
  return usage < limit;
}

export function canAccessModel(user: UserProfile, modelId: string): boolean {
  // Global access check for models if needed, currently all active models are accessible
  // but can be restricted by plan if desired.
  return true;
}

export function getUpgradePath(currentPlan: Plan): Plan[] {
  const plans: Plan[] = ['FREE', 'PRO', 'PLUS', 'ELITE'];
  const currentIndex = plans.indexOf(currentPlan);
  return plans.slice(currentIndex + 1);
}
