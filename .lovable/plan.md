

## Visibility Fixes — Two Screens

### EntityQuestions.tsx
1. Question text: `color: '#e0ddd5'` (solid hex, no rgba)
2. Button text: `color: '#c8c5bd'`; hover text → `#e0ddd5`; mouseLeave resets to `#c8c5bd`
3. Button border: `1px solid rgba(169,140,255,0.4)`; hover border → `rgba(169,140,255,0.55)`; mouseLeave → `rgba(169,140,255,0.4)`
4. Button background: `rgba(169,140,255,0.06)`
5. Warning "choose carefully" text: `color: '#9a9890'`

### ProfileSetup.tsx
6. Avatar inner circle background: `#1a1a2e`
7. Avatar inner circle border: `1px solid #3a3a5a`
8. SVG silhouette fill (both `<circle>` and `<path>`): `#4a4a7a`
9. Outer ring border: `1px solid rgba(169,140,255,0.2)`
10. CTA button text: change from `"ENTER THE DIMENSION"` to `"ENTER"`

No changes to animations, fonts, layout, reveal behavior, or navigation.

