

## PRÆM — Dark Atmospheric Launch Screen

### Design System Setup
- Add CSS variables for all colors (background #04040a, primary #e0ddd5, secondary #9a9890, muted #5a5855, gold #c8943a, purple #a98cff, teal #1a9e7a)
- Import Google Fonts: Cinzel (400, 500), IM Fell English (400, italic), DM Mono (300, 400, 500)
- Add `style="background-color:#04040a"` to `<body>` in index.html to prevent white flash
- Update Tailwind config with custom colors and font families

### Launch Screen (Index page)
Full viewport, centered content on #04040a background:

1. **Sigil** — 5×5 grid of 10px circles with 4px gap, specific pattern of FILLED (pulsing glow, staggered delays), DIM (static low opacity), and EMPTY (faint border) circles

2. **Wordmark** — "PRÆM" in Cinzel 400, 42px mobile / 52px desktop, letter-spacing 0.25em, 28px below sigil

3. **Enter Button** — "ENTER" in IM Fell English italic, 12px, letter-spacing 0.4em, muted color, hairline border, sharp corners, breathing animation

4. **Background Glow** — Centered radial gradient ellipse with warm undertone

5. **Stars** — 10 tiny dots (1–1.5px) scattered outside center 40%, each with unique opacity and twinkle animation timing

Nothing else — pure atmosphere.

