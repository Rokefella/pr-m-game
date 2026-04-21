

## Village Redesign — Scrollable Eye-Shaped City Map

Replace `src/pages/Village.tsx` entirely. No other files change. Existing route `/village`, Door transition, and HUD style preserved.

### Architecture

```text
[viewport div: 100vw × 100vh, overflow hidden, bg #04040a]
  └─ [map div: 1200×800, position relative, transform: translate(camX, camY)]
       ├─ grid overlay (1200×800)
       ├─ pupil ellipse outline + ∅ label
       ├─ Type C buildings (70, hardcoded)
       ├─ Type B buildings (30, hardcoded)
       ├─ Type A buildings (3: 23, 47, 89)
       ├─ trail dots (up to 50)
       └─ player dot
  └─ [fixed UI overlay layer, screen-anchored]
       ├─ entity quote (top)
       ├─ D-pad (above HUD, centered)
       └─ HUD bar (bottom)
```

The map translates so player stays centered: `translate(viewportW/2 - playerX, viewportH/2 - playerY)`. Camera is clamped so we don't reveal black void beyond map edges (clamp translate so map edges meet viewport edges when player nears the edge).

### Constants & coordinates

- Map: `MAP_W=1200`, `MAP_H=800`, center `(600, 400)`.
- Rings: outer `rx=520, ry=280`; middle `rx=340, ry=180`; inner `rx=160, ry=80`.
- Step: `STEP=12px` per d-pad press.

### Hardcoded building positions

A single static module-level array of `{ id, type, x, y, w, h }` — generated once at file authoring time using deterministic angle sweeps so the map is identical every session.

- **Type A (3, interactive)**:
  - `23`: inner-ring left → `x=380, y=375, w=70, h=50` (color `#4a9eff`)
  - `47`: middle-ring right-lower → `x=860, y=440, w=70, h=50` (color `#1d9e75`)
  - `89`: middle-ring upper → `x=555, y=170, w=90, h=70` (color `#c8963a`, pulsing border)
- **Type B (30)**: angles roughly every 12° around middle ring + a few on inner ring; each placed at ellipse point with small jitter (±8px) and varied size (35–65 × 25–55). Hand-tuned to leave radial street gaps.
- **Type C (70)**: angles every ~5° around outer ring + scattered between outer/middle. Sizes 20–45 × 15–35. Several gaps preserved as streets.

All numbers are literal constants in the file (no `Math.random` at render). I'll author the arrays so:
- No Type B/C overlaps any Type A rect (with 4px padding).
- Multiple radial streets exist between rings.
- Inner ring (pupil) is empty of buildings.

### Background & pupil

- Map div: pure black `#04040a` with the same purple grid (`linear-gradient` 40px) as before, sized 1200×800.
- Pupil outline: an absolutely positioned div at `(440, 320)` size `320×160`, `border: 0.5px solid rgba(100,80,160,0.15)`, `border-radius: 50%`, no fill.
- Center symbol: `∅` at exact `(600, 400)`, `font-mono`, `24px`, `color: rgba(100,80,160,0.2)`, translated so its center sits on map center.

### Player dot & trail

- State: `player: {x, y}`, `trail: {x,y,id}[]` (cap 50, FIFO — oldest dropped, no fade animation; permanent for session).
- Start: compute random angle θ once via `useState` initializer, project onto outer ellipse: `x = 600 + 520*cos(θ)`, `y = 400 + 280*sin(θ)`.
- Render: 8px purple dot with `boxShadow: 0 0 8px rgba(91,79,212,0.8)` and idle pulse keyframe (`villageIdle` scale 1→1.15→1, 1.5s infinite). Positioned absolutely on the map (so it pans with map, but visually stays centered because the map translation cancels its position).
- Trail dots: 4px circles, `rgba(91,79,212,0.15)`, no animation, no removal.

### D-pad

Fixed to viewport, `bottom: 70px` (above HUD), centered. 3×3 plus layout via CSS grid with empty cells:

```
.   ▲   .
◄   .   ►
.   ▼   .
```

Each button 44×44, 4px gap, `bg rgba(91,79,212,0.15)`, `border 0.5px solid rgba(91,79,212,0.4)`, `border-radius: 4px`, `color rgba(160,140,200,0.8)`, font 16px. Handler on `onPointerDown` (covers touch + mouse, no double-fire on click). Each press:
1. Computes new `(x,y)` clamped to `[0..1200]` × `[0..800]`.
2. Pushes previous position into trail (cap 50).
3. Updates `player`.
4. Runs collision check against the 3 Type A rects.

### Collision

Helper `inside(px, py, rect)` checks player center against each Type A rect:
- `89` → `setTimeout(navigate('/door'), 600)` (guard a `navigatedRef` so multiple steps inside don't double-fire).
- `23` / `47` → `setFeedback({ id })` for 1500ms; render "Not yet." line below the label inside that building (font-fell italic 10px `rgba(160,140,200,0.5)`, animation `villageNotYet 1.5s ease-out forwards`).

Type B and C are decorative — no collision.

### Camera

Computed each render:
```
const camX = Math.min(0, Math.max(VIEW_W - MAP_W, VIEW_W/2 - player.x));
const camY = Math.min(0, Math.max(VIEW_H - MAP_H, VIEW_H/2 - player.y));
```
Where `VIEW_W/H` come from `window.innerWidth/innerHeight`, captured via `useEffect` + `resize` listener (default to 390×800 on first render to match mobile). Map div uses `transform: translate(camX, camY)` with no transition (snappy follow).

### Entity quote & HUD

- Quote: fixed `top: 24px`, full-width centered, `font-fell italic`, 13px, `rgba(160,140,200,0.6)`, pointer-events none.
- HUD: identical to current implementation — fixed bottom, three flex columns `MAZE STEPS  0` / `CREDITS  0` / `LEVEL  1`. `MAZE STEPS` is hardcoded `0` (no counter in village).

### Keyframes (inline `<style>`)

```
@keyframes villagePulse { 0%,100% { opacity:.4 } 50% { opacity:1 } }
@keyframes villageIdle  { 0%,100% { transform: scale(1) } 50% { transform: scale(1.15) } }
@keyframes villageNotYet { 0% { opacity:.6 } 80% { opacity:.6 } 100% { opacity:0 } }
```

### Out of scope

- No changes to `Door.tsx`, `App.tsx`, `ProfileSetup.tsx`, `EntityQuestions.tsx`, `Index.tsx`, or any other file.
- No minimap, no credits/steps logic, no new routes, no new assets.

