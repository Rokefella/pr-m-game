// Display only: keep stored primes and gameplay comparisons numeric.
export function formatPrime(n: number | string): string {
  return String(n).padStart(5, '0');
}