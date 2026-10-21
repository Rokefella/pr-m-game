import { describe, expect, it } from 'vitest';
import { LABEL_NAME_PX, LABEL_TITLE_PX, labelPositions, truncateOrbText } from './orbLabelGeometry';
import { npcBodySize, npcSvgWidth } from '@/components/theme/objects/NpcOrb';
describe('Screen-space orb geometry', () => {
  it('keeps name and title at eight screen pixels', () => {
    expect(LABEL_NAME_PX).toBe(8); expect(LABEL_TITLE_PX).toBe(8);
  });
  it('limits NPC bodies to rounded screen-avatar times 1.15 and derives the full art width', () => {
    expect(npcBodySize(25)).toBe(29); expect(npcBodySize(30)).toBe(35);
    expect(npcSvgWidth(29) * 36 / 60).toBeCloseTo(29);
  });
  it('keeps the two-pixel name gap and three-pixel title gap regardless of zoom', () => {
    for (const zoom of [1, 1.5, 2]) {
      const height = 25 * 100 / 92 * zoom;
      const positions = labelPositions({ left: 100, top: 200, width: 25 * zoom, height }, 'avatar');
      expect(positions.nameY - (200 + height * .78)).toBeCloseTo(2);
      expect(200 + height * .2 - positions.titleY).toBeCloseTo(3);
      expect(positions.x).toBe(100 + 12.5 * zoom);
    }
  });
  it('truncates titles at eighteen characters', () => {
    expect(truncateOrbText('123456789012345678', 18)).toBe('123456789012345678');
    expect(truncateOrbText('1234567890123456789', 18)).toBe('123456789012345678…');
  });
});