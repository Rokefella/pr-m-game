import { Purchases, type PurchasesOffering } from '@revenuecat/purchases-js';

const RC_API_KEY = 'test_SDEYzqawaDVeDcCQsditmNwaLbN';

export async function initRevenueCat(userId: string) {
  return Purchases.configure(RC_API_KEY, userId);
}

export async function getOffering(): Promise<PurchasesOffering | null> {
  try {
    const offerings = await Purchases.getSharedInstance().getOfferings();
    return offerings.current;
  } catch (e) {
    console.error('[RC] getOffering error', e);
    return null;
  }
}

export async function purchasePackage(rcPackage: any) {
  return Purchases.getSharedInstance().purchase({ rcPackage });
}

export async function checkEntitlement(): Promise<boolean> {
  try {
    const ci = await Purchases.getSharedInstance().getCustomerInfo();
    return !!ci.entitlements.active['praem_access'];
  } catch (e) {
    console.error('[RC] checkEntitlement error', e);
    return false;
  }
}

export async function restorePurchases() {
  return Purchases.getSharedInstance().restorePurchases();
}
