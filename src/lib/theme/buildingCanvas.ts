import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import BuildingBlock from '@/components/theme/BuildingBlock';
import { loadSvgCanvas } from '@/lib/terrainTile';

/** Village-builder BuildingBlock art rasterised for canvas, cached per footprint (16 px per cell). */
const blocks = new Map<string, HTMLCanvasElement | null>();
let tokenValues: Record<string, string> | null = null;
export let buildingVersion = 0;
export function buildingBlockCanvas(cols: number, rows: number): HTMLCanvasElement | undefined {
  const key = `${cols}x${rows}`;
  if (blocks.has(key)) return blocks.get(key) ?? undefined;
  blocks.set(key, null);
  if (typeof document === 'undefined') return undefined;
  if (!tokenValues) tokenValues = {};
  const styles = getComputedStyle(document.documentElement);
  let svg = renderToStaticMarkup(createElement(BuildingBlock, { cols, rows, size: 16, doorway: false }));
  svg = svg.replace(/var\((--[\w-]+)\)/g, (_, name: string) => (tokenValues![name] ??= styles.getPropertyValue(name).trim() || '#3a4272'));
  if (!svg.includes('xmlns=')) svg = svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  void loadSvgCanvas(svg, cols * 16, rows * 16).then(c => { if (c) { blocks.set(key, c); buildingVersion++; } });
  return undefined;
}
