export const Z = { WORLD: 0, OBJECTS: 10, ORB_LABELS: 20, HUD: 60, SHEET: 80, OVERLAY: 100, PROFILE: 120, MODAL: 140 } as const;

// CSS layers read this same scale; no independent CSS numeric scale.
if (typeof document !== 'undefined') {
  Object.entries(Z).forEach(([name, value]) => {
    document.documentElement.style.setProperty(`--z-${name.toLowerCase().replace('_', '-')}`, String(value));
  });
}