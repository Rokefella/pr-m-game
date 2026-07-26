import { getOffering, purchasePackage, restorePurchases } from '@/lib/revenuecat';
import { supabase } from '@/lib/supabase';

export type PurchaseTier = 'monthly' | 'annual' | 'founding';

const TIER_TO_PACKAGE_ID: Record<PurchaseTier, string> = {
  founding: 'lifetime',
  monthly: 'monthly',
  annual: 'yearly',
};

/**
 * Purchase a tier for a user and mark the users row as active.
 * Throws if the package is unavailable or the purchase fails.
 */
export async function purchaseTier(userId: string, tier: PurchaseTier): Promise<void> {
  const offering = await getOffering();
  const pkg = offering?.availablePackages?.find(
    (p: { identifier: string }) => p.identifier === TIER_TO_PACKAGE_ID[tier],
  );
  if (!pkg) throw new Error('This option is unavailable right now.');

  await purchasePackage(pkg);

  const { error } = await supabase
    .from('users')
    .update({ subscription_status: 'active', subscription_tier: tier })
    .eq('id', userId);
  if (error) throw new Error(error.message);
}

/** Restore an existing purchase. Returns true when an active entitlement was found. */
export async function restoreForUser(userId: string): Promise<boolean> {
  const ci: any = await restorePurchases();
  if (!ci?.entitlements?.active?.['praem_access']) return false;
  const { error } = await supabase
    .from('users')
    .update({ subscription_status: 'active' })
    .eq('id', userId);
  if (error) throw new Error(error.message);
  return true;
}

/** Redeem the beta access code. Returns true when the code was valid. */
export async function redeemBetaCode(userId: string, code: string): Promise<boolean> {
  if (code.trim().toUpperCase() !== 'PRAEM2026') return false;
  const { error } = await supabase
    .from('users')
    .update({ subscription_status: 'beta' })
    .eq('id', userId);
  if (error) throw new Error(error.message);
  return true;
}
