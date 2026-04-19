

## New Village Screen + Door Transition

### 1. Add image assets
- Copy `user-uploads://Village.png` → `public/village.png`
- Copy `user-uploads://door.png` → `public/door.png`

### 2. New file: `src/pages/Village.tsx`

Mobile column (max-width 390px, centered, min-h-screen, relative).

**Layers (bottom → top):**
- `<img src="/village.png">` absolute inset-0, `object-fit: cover`, with state-driven `transform: scale(1.0 → 1.08)` on tap, `transition: transform 800ms ease-in-out`
- Dark overlay: absolute inset-0, `background: rgba(0,0,0,0.15)`
- Prime number labels (absolute positioned, `font-mono`, 14px):
  - `23` — left ~15%, top ~45%, color `#4a9eff`
  - `47` — right ~15%, top ~50%, color `#1d9e75`
  - `89` — center ~50%, top ~30% (above door), color `#c8963a`
- Entity quote — top center (~top 6%), `font-fell italic`, 13px, color `rgba(160,140,200,0.7)`: *"Another one enters?"*
- Player silhouette SVG — absolute, centered horizontally, ~bottom 18%, ~40px wide, fill `#5b4fd4` (reuse silhouette shape from ProfileSetup but smaller)
- HUD bar — absolute bottom, full width of column, `background: rgba(4,4,10,0.92)`, `border-top: 0.5px solid rgba(169,140,255,0.3)`, padding `10px 14px`, three flex columns (`font-mono`, 9px, `letter-spacing: 0.18em`):
  - Left: `MAZE STEPS  0` color `#e0ddd5`
  - Center: `CREDITS  0` color `#c8963a`
  - Right: `LEVEL  1` color `#5b4fd4`

**Interaction:**
- `useState` for `tapCount` (number) and `zoomed` (boolean)
- Full-screen overlay button (absolute inset-0, transparent, above background but below labels/HUD via z-index) detects taps
- On tap: increment `tapCount`, toggle scale to 1.08 then back to 1.0 after 800ms
- When `tapCount >= 3`: navigate to `/door`

### 3. New file: `src/pages/Door.tsx`

- Full-screen `<img src="/door.png">` cover fit
- Dark overlay `rgba(0,0,0,0.25)` for text legibility
- Centered column:
  - Text *"See you on the other side?"* — `font-fell italic`, 18px, color `#e0ddd5`, text-shadow for legibility
  - Two buttons side-by-side, `marginTop: 28`:
    - **YES** — `font-cinzel`, 11px, `letter-spacing: 0.28em`, bg `#c8963a`, color `#04040a`, padding `10px 22px`, no radius
    - **STAY** — `font-cinzel`, 11px, `letter-spacing: 0.28em`, bg transparent, border `0.5px solid #5a5855`, color `#9a9890`, padding `10px 22px`
  - Both buttons currently no-op (no destination specified)

### 4. Routes — `src/App.tsx`
Add (above catch-all):
```
<Route path="/village" element={<Village />} />
<Route path="/door" element={<Door />} />
```

### 5. Wire entry from ProfileSetup
Update ENTER button on `ProfileSetup.tsx` to `navigate('/village')` (uses `useNavigate`).

No changes to existing Index, EntityQuestions screens. Fonts reuse Cinzel / IM Fell English / DM Mono.

