import { getOffering, purchasePackage, restorePurchases } from '@/lib/revenuecat';
import { recordPurchase, redeemCode } from '@/lib/serverGame';
import { notifySaveFailed } from '@/lib/saveNotice';

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

  const result = await recordPurchase(tier);
  if (!result.ok) { notifySaveFailed('purchase', result.reason); throw new Error("That didn't save. Try again."); }
}

/** Restore an existing purchase. Returns true when an active entitlement was found. */
export async function restoreForUser(userId: string): Promise<boolean> {
  const ci: any = await restorePurchases();
  if (!ci?.entitlements?.active?.['praem_access']) return false;
  const result = await recordPurchase(null);
  if (!result.ok) { notifySaveFailed('restore', result.reason); throw new Error("That didn't save. Try again."); }
  return true;
}

/** Redeem the beta access code. Returns true when the code was valid. */
export async function redeemBetaCode(userId: string, code: string): Promise<boolean> {
  const result = await redeemCode(code.trim());
  if (!result.ok) {
    if (result.reason !== 'bad_code' && result.reason !== 'invalid_code') notifySaveFailed('beta code', result.reason);
    return false;
  }
  return result.ok;
}
