import type { MerchantItem } from '@/components/MerchantOverlay';
export const MERCHANT_LINES = [
  'You need more steps. I have them.',
  "The fragments don't find themselves.",
  'What you lack, I carry.',
];
export function merchantItems(level: number, home: 'world' | 'village', buySteps: NonNullable<MerchantItem['onPurchase']>): MerchantItem[] {
  const items: MerchantItem[] = [{ key: 'steps', label: '500 Steps', cost: 5, onPurchase: buySteps }];
  if (home === 'world') return items;
  items.push({ key: 'visibility', label: 'Visibility +2 cells (this run)', cost: 20 });
  if (level >= 5) items.push({ key: 'detector', label: 'Fragment Detector (60 sec)', cost: 50 });
  if (level >= 10) items.push({ key: 'primemap', label: 'Prime Map (60 sec)', cost: 100 });
  if (level >= 15) items.push({ key: 'pastmaze', label: 'Past Maze Access', cost: 200, onPurchase: () => 'Available in the Shadow Realm.' });
  return items;
}
