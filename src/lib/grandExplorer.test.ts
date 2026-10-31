import { describe, expect, it } from 'vitest';
import { claimedDate, explorerComplete, explorerPercentLabel, isGrandExplorerSign } from './grandExplorer';
import { comingSoonSkins, skinTitle } from '@/components/Wardrobe';

describe('Grand Explorer', () => {
  it('shows one decimal and never 100 before every land block is walked', () => {
    expect(explorerPercentLabel({ explored: 398, total: 9709, percent: 4.099 })).toBe('4');
    expect(explorerPercentLabel({ explored: 400, total: 9709, percent: 4.12 })).toBe('4.1');
    expect(explorerPercentLabel({ explored: 9708, total: 9709, percent: 99.99 })).toBe('99.9');
    expect(explorerPercentLabel({ explored: 9709, total: 9709, percent: 100 })).toBe('100');
  });
  it('offers the claim only at all 9,709 land blocks', () => {
    expect(explorerComplete({ explored: 9708, total: 9709 })).toBe(false);
    expect(explorerComplete({ explored: 9709, total: 9709 })).toBe(true);
  });
  it('is only the signpost at (5,3) on the surface', () => {
    expect(isGrandExplorerSign({ x: 5, y: 3, layer: 0, action: 'signpost' })).toBe(true);
    expect(isGrandExplorerSign({ x: 5, y: 2, layer: 0, action: 'signpost' })).toBe(false);
    expect(isGrandExplorerSign({ x: 5, y: 3, layer: 1, action: 'signpost' })).toBe(false);
  });
  it('formats a claimed timestamp as a date and ignores a bare flag', () => {
    expect(claimedDate('2026-10-31T12:00:00Z')).toBe('31 October 2026');
    expect(claimedDate(true)).toBeNull();
  });
  it('lists an owned skin without a catalogue row as coming soon', () => {
    expect(comingSoonSkins(new Set(['visitor', 'cartographer', 'ember']), [{ skin_key: 'visitor' }, { skin_key: 'ember' }])).toEqual(['cartographer']);
    expect(skinTitle('cartographer')).toBe('Cartographer');
  });
});
