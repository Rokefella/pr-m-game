/** Clockwise integer spiral, with 2 east of the centre and 3 northeast. */
export function ulamIndex(col: number, row: number, gridSize: number): number {
  const cx = Math.floor(gridSize / 2);
  const x = col - cx;
  const y = cx - row;
  const k = Math.max(Math.abs(x), Math.abs(y));
  if (k === 0) return 1;
  const base = (2 * k - 1) ** 2;
  if (x === k && y > -k) return base + y + k;
  if (y === k) return base + 2 * k + k - x;
  if (x === -k) return base + 4 * k + k - y;
  return base + 6 * k + x + k;
}

const primeCache = new Map<number, boolean>();

export function isPrime(n: number): boolean {
  const cached = primeCache.get(n);
  if (cached !== undefined) return cached;
  let result = Number.isInteger(n) && n >= 2;
  if (result && n > 2 && n % 2 === 0) result = false;
  for (let divisor = 3; result && divisor * divisor <= n; divisor += 2) {
    if (n % divisor === 0) result = false;
  }
  // Bound the cache for future large levels.
  if (primeCache.size >= 4096) primeCache.clear();
  primeCache.set(n, result);
  return result;
}