

## Changes Across Two Screens

### Screen 1 — EntityQuestions.tsx

**Eye enlargement:** Change SVG to 90×52, viewBox to "0 0 90 52". Scale elements proportionally:
- Outer ellipse: cx=45, cy=26, rx=43, ry=24
- Iris: cx=45, cy=26, r=14
- Pupil: cx=45, cy=26, r=5.2
- Highlight: cx=47.6, cy=23.4, r=1.7

**Click-to-reveal interaction:** Add `useState` for `revealed` boolean. On eye click, set `revealed = true`.
- Question, buttons container, and warning all start with `opacity: 0, transform: translateY(8px)`, transitioning to `opacity: 1, translateY(0)`.
- Question: `transition: opacity 1.5s, transform 1.5s` — triggered immediately on reveal.
- Each button gets `transitionDelay`: 1.5s, 1.8s, 2.1s (0.3s stagger after question).
- Warning: `transitionDelay: 2.4s`.
- All use `transition: opacity 0.8s, transform 0.8s` (buttons/warning).

**Eye hover:** Add `useState` for `eyeHovered`. On hover, change outer ellipse stroke to `rgba(169,140,255,0.65)`.

**Eye cursor:** Add `cursor: pointer` to SVG.

### Screen 2 — ProfileSetup.tsx

Color updates only (no layout changes):
- Title "Who are you?": `#e0ddd5`
- Username label: stays `#9a9890` ✓
- Input: background `#0e0e16`, border `0.5px solid #3a3a44`, text `#e0ddd5`, placeholder `#5a5855`
- Warning: `rgba(169,140,255,0.8)`
- Aura label: stays `#9a9890` ✓
- Aura colors: `#2a2a32`, `#1a2a4a`, `#1a3a2a`, `#3a1a1a`, `#2a1a4a`; selected border `1.5px solid #a98cff`
- Title slot: bg `#0a0a14`, border `0.5px solid #2a2a3a`
- "Title" label: `#5a5870`
- "—" value: `#5a5870`
- Hint: `#4a4860`
- CTA button: unchanged (already correct values)

