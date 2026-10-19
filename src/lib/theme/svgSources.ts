export type StyleKey = 'plated' | 'chevron' | 'hex' | 'lightstrip' | 'gold' | 'ulam';

export const WALL_STYLES: Record<StyleKey, string> = {
  plated: `<rect width="48" height="48" fill="#58619a"/><rect x="6" y="6" width="36" height="36" fill="#4a5385" stroke="#2f3560"/><path d="M0 1H48M1 0V48" stroke="#9aa4d8" opacity=".8" fill="none"/><path d="M0 47H48M47 0V48" stroke="#2f3560" stroke-width="2" fill="none"/><path d="M9 9h3v3H9zM36 9h3v3h-3zM9 36h3v3H9zM36 36h3v3h-3z" fill="#aab4e8"/><path d="M18 24H30" stroke="$G" stroke-width="5" opacity=".22" fill="none"/><path d="M18 24H30" stroke="$G" stroke-width="2" fill="none"/>`,
  chevron: `<rect width="48" height="48" fill="#55608f"/><path d="M0 8L24 20L48 8M0 28L24 40L48 28" stroke="#35406e" stroke-width="6" fill="none"/><path d="M0 5L24 17L48 5M0 25L24 37L48 25" stroke="#8e99d0" stroke-width="1.5" fill="none"/><path d="M0 1H48" stroke="#aab4e8" fill="none"/><path d="M0 47H48M47 0V48" stroke="#2a3160" stroke-width="2" fill="none"/>`,
  hex: `<rect width="48" height="48" fill="#3d4575"/><path d="M43 24L33.5 40.5H14.5L5 24L14.5 7.5H33.5Z" fill="#5d67a0" stroke="#2d3562" stroke-width="2"/><path d="M36 24L30 34.4H18L12 24L18 13.6H30Z" fill="#4a5385" stroke="#8e99d0"/><path d="M22 22h4v4h-4z" fill="$G"/>`,
  lightstrip: `<rect width="48" height="48" fill="#3f4878"/><rect y="10" width="48" height="14" fill="#46508a" opacity=".6"/><rect y="2" width="48" height="7" fill="$G" opacity=".2"/><rect y="4" width="48" height="3" fill="$G"/><rect y="41" width="48" height="2" fill="$G" opacity=".6"/><path d="M0 0V48" stroke="#2a3160" stroke-width="2" fill="none"/><path d="M1 0V48" stroke="#7c86b8" fill="none"/>`,
  gold: `<rect width="48" height="48" fill="#565a8c"/><rect x="5" y="5" width="38" height="38" fill="#4a4e80" stroke="#2c2f5a"/><path d="M9 24H17V16H31V24H39M9 32H19M29 32H39" stroke="#c8963a" stroke-width="1.5" fill="none"/><path d="M5 12V5H12M36 5H43V12M5 36V43H12M36 43H43V36" stroke="#e0b25a" stroke-width="1.5" fill="none"/><path d="M16 15h3v3h-3zM30 15h3v3h-3z" fill="#f5c060"/>`,
  ulam: `<rect width="48" height="48" fill="#4e5784"/><rect x="4" y="4" width="40" height="40" fill="#454d7c" stroke="#2c3260"/><path d="M0 1H48" stroke="#9aa4d8" opacity=".7" fill="none"/><path d="M4 22H44" stroke="#2c3260" fill="none"/><path d="M4 21v6M6 21v6M10 21v6M14 21v6M22 21v6M26 21v6M34 21v6M38 21v6M46 21v6" stroke="$G" stroke-width="2" fill="none"/>`,
};

export type FloorStyleKey = StyleKey | 'ground' | 'plaza';
export const FLOOR_STYLES: Record<FloorStyleKey, string> = {
  ground: `<rect width="48" height="48" fill="#304d58"/><path d="M5 9h3v2H5zM32 6h2v3h-2zM19 28h4v2h-4zM40 39h3v2h-3z" fill="#477078" opacity=".55"/><path d="M9 38l2-4 2 4M33 22l2-3 2 3" stroke="#558781" opacity=".45" fill="none"/>`,
  plaza: `<rect width="48" height="48" fill="#4c5688"/><path d="M0 1H48M1 0V48" stroke="#8e99d0" opacity=".6" fill="none"/><path d="M0 47H48M47 0V48" stroke="#2f3560" stroke-width="2" fill="none"/><path d="M20 24h8M24 20v8" stroke="$G" stroke-width="1.5" opacity=".6" fill="none"/>`,
  plated: `<rect width="48" height="48" fill="#3e4672"/><path d="M0 1H48M1 0V48" stroke="#2a3052" stroke-width="2" fill="none"/><path d="M0 30H14V18H30V30H48" stroke="$G" stroke-width="1.5" opacity=".32" fill="none"/><path d="M28 16h4v4h-4z" fill="$G" opacity=".6"/><path d="M4 4h2v2H4zM42 42h2v2h-2z" fill="#7c86b8" opacity=".6"/>`,
  chevron: `<rect width="48" height="48" fill="#3a4270"/><path d="M0 1H48M1 0V48" stroke="#2a3052" stroke-width="2" fill="none"/><path d="M12 18L24 26L36 18M12 32L24 40L36 32" stroke="$G" stroke-width="1.5" opacity=".3" fill="none"/>`,
  hex: `<rect width="48" height="48" fill="#384069"/><path d="M0 1H48M1 0V48" stroke="#2a3052" stroke-width="2" fill="none"/><path d="M43 24L33.5 40.5H14.5L5 24L14.5 7.5H33.5Z" stroke="$G" opacity=".3" fill="none"/>`,
  lightstrip: `<rect width="48" height="48" fill="#363e6a"/><path d="M0 0H48M0 0V48" stroke="$G" stroke-width="4" opacity=".12" fill="none"/><path d="M0 0H48M0 0V48" stroke="$G" stroke-width="1.5" opacity=".55" fill="none"/><path d="M0 0h3v3H0z" fill="#aef6ff"/>`,
  gold: `<rect width="48" height="48" fill="#3d4170"/><path d="M0 1H48M1 0V48" stroke="#2a3052" stroke-width="2" fill="none"/><circle cx="24" cy="24" r="16" stroke="#c8963a" stroke-dasharray="3 3" opacity=".5" fill="none"/><circle cx="24" cy="24" r="9" stroke="#c8963a" opacity=".4" fill="none"/><path d="M24 4V9M24 39V44M4 24H9M39 24H44" stroke="#c8963a" opacity=".6" fill="none"/>`,
  ulam: `<rect width="48" height="48" fill="#3a4270"/><path d="M0 1H48M1 0V48" stroke="#2a3052" stroke-width="2" fill="none"/><path d="M15 7h2v2h-2zM23 7h2v2h-2zM31 7h2v2h-2zM7 15h2v2H7zM23 15h2v2h-2zM39 15h2v2h-2zM15 23h2v2h-2zM23 23h2v2h-2zM7 31h2v2H7zM23 31h2v2h-2zM31 31h2v2h-2zM39 31h2v2h-2zM7 39h2v2H7zM15 39h2v2h-2zM31 39h2v2h-2zM39 39h2v2h-2z" fill="#6a74b0" opacity=".55"/><path d="M30 22h4v4h-4zM30 14h4v4h-4zM14 14h4v4h-4zM14 30h4v4h-4zM38 22h4v4h-4zM38 6h4v4h-4zM6 6h4v4H6zM6 22h4v4H6zM22 38h4v4h-4z" fill="$G"/>`,
};

const STREET_H = `<rect width="48" height="48" fill="#454e7a"/><path d="M0 0h48v5H0zM0 43h48v5H0z" fill="#2a3060"/><path d="M0 5H48M0 43H48" stroke="#8e99d0" opacity=".7" fill="none"/><path d="M4 24H14M19 24H29M34 24H44" stroke="$G" stroke-width="6" opacity=".2" fill="none"/><path d="M4 24H14M19 24H29M34 24H44" stroke="$G" stroke-width="3" fill="none"/>`;
export const STREET_STYLES: Record<string, string> = {
  h: STREET_H,
  v: `<g transform="rotate(90 24 24)">${STREET_H}</g>`,
  x: `<rect width="48" height="48" fill="#454e7a"/><path d="M0 0h5v5H0zM43 0h5v5h-5zM0 43h5v5H0zM43 43h5v5h-5z" fill="#2a3060"/><path d="M4 24H14M34 24H44M24 4V14M24 34V44" stroke="$G" stroke-width="3" fill="none"/><path d="M24 18L30 24L24 30L18 24Z" fill="none" stroke="$G" stroke-width="2"/><path d="M22 22h4v4h-4z" fill="$G"/>`,
};
const TREE = `<ellipse cx="24" cy="42" rx="12" ry="3" fill="#000" opacity=".35"/><rect x="22" y="32" width="4" height="9" fill="#4a3f5a"/><path d="M16 6H32V10H38V26H32V30H16V26H10V10H16Z" fill="#1f8f7a" stroke="#0f5c4b"/><path d="M14 10h10v4H14zM12 14h4v8h-4z" fill="#3cc4a0"/><path d="M26 16h2v2h-2zM18 22h2v2h-2zM30 24h2v2h-2z" fill="#aef6e0"/>`;
export const TREE_STYLES: Record<string, string> = {
  tree: TREE,
  dense: `<g transform="translate(24 24) scale(1.12) translate(-24 -24)">${TREE}</g>`,
};

