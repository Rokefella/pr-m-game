import { checkTrial } from '@/lib/serverGame';
import { notifySaveFailed } from '@/lib/saveNotice';
import { BETA_MODE } from '@/lib/config';

export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'lifetime' | 'dev' | 'beta';

export async function checkSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
  if (BETA_MODE) return 'active';

  try {
    const result = await checkTrial();
    if (!result.ok) throw new Error(result.reason ?? 'Trial check refused');
    return (result.status ?? result.subscription_status ?? 'expired') as SubscriptionStatus;
  } catch (error) {
    notifySaveFailed('trial check', error);
    return 'expired';
  }
}

export function canAccessMaze(status: SubscriptionStatus): boolean {
  return BETA_MODE || ['trial', 'active', 'lifetime', 'dev', 'beta'].includes(status);
}

export function getDaysRemainingInTrial(trialEnd: string): number {
  const end = new Date(trialEnd);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}
