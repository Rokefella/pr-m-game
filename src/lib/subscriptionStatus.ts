import { supabase } from '@/lib/supabase';

export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'lifetime' | 'dev' | 'beta';

export async function checkSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
  const { data, error } = await supabase
    .from('users')
    .select('subscription_status, trial_end')
    .eq('id', userId)
    .single();

  if (error || !data) return 'expired';

  const status = data.subscription_status as SubscriptionStatus;

  if (status === 'trial') {
    const trialEnd = new Date(data.trial_end);
    if (new Date() > trialEnd) {
      await supabase
        .from('users')
        .update({ subscription_status: 'expired' })
        .eq('id', userId);
      return 'expired';
    }
  }

  return status;
}

export function canAccessMaze(status: SubscriptionStatus): boolean {
  return ['trial', 'active', 'lifetime', 'dev', 'beta'].includes(status);
}

export function getDaysRemainingInTrial(trialEnd: string): number {
  const end = new Date(trialEnd);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}
