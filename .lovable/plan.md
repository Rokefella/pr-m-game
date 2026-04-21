

## Village.tsx — 8 Fixes + Global Font

### FIX 1 — Global font +1px (`src/index.css`)
Add to the `body` rule inside `@layer base`:
```css
body {
  @apply bg-background text-foreground;
  font-family: 'IM Fell English', serif;
  font-size: 17px;
}
```

### FIX 2 — Building visibility (`src/pages/Village.tsx`)
- Type B: `border: 1px solid rgba(100,80,160,0.45)`, `background: rgba(100,80,160,0.12)`
- Type C: `border: 0.5px solid rgba(100,80,160,0.25)`, `background: rgba(100,80,160,0.07)`
- Type A unchanged.

### FIX 4 — Larger map (do before regenerating buildings)
- `MAP_W=1600`, `MAP_H=1000`, `CX=800`, `CY=500`
- `OUTER_RX=680, OUTER_RY=380` · `MIDDLE_RX=440, MIDDLE_RY=240` · `INNER_RX=200, INNER_RY=100`
- Type A repositioned on new ellipses:
  - `89` (middle-upper): `x=755, y=240, w=90, h=70`
  - `23` (inner-left): `x=520, y=475, w=70, h=50`
  - `47` (middle-right-lower): `x=1150, y=560, w=70, h=50`
- Camera clamp uses new `MAP_W/MAP_H`.

### FIX 3 — Denser buildings (50 B + 120 C)
Replace both arrays with deterministic angle-sweep generators evaluated **once at module load** (`const TYPE_B = (() => { ... })()`). All values literal-equivalent (no per-render randomness; use a seeded LCG so jitter is stable):

- **Type B (50)**: 36 around middle ring (every 10°) + 14 around inner ring (every ~25°).
  For each angle θ: base point on ellipse, jitter ±6px, size 35–55 × 25–45. Skip any candidate whose rect overlaps a Type A rect (with 4px padding) or a previously placed B rect (with 18px street gap) — re-roll jitter up to 4 times, otherwise drop and continue. Target gap between adjacent B rects: 15–25px.
- **Type C (120)**: 72 around outer ring (every 5°) + 30 between outer/middle (two intermediate ellipses at 0.85× and 0.7× outer) + 18 between middle/inner. Sizes 20–40 × 15–30. Same overlap rules with 12px street gap, padded against A and B.
- Inner pupil (within `INNER_RX × INNER_RY`) stays empty.
- Generator uses a fixed seed → identical map every session.

### FIX 5 — Ring ellipse outlines
Three absolutely positioned divs inside the map div, behind buildings (`zIndex: 1`), `border-radius: 50%`, no fill:
- Outer: `left=CX-OUTER_RX, top=CY-OUTER_RY, w=2*OUTER_RX, h=2*OUTER_RY`, `border: 0.5px solid rgba(100,80,160,0.06)`
- Middle: same pattern with middle radii, opacity `0.08`
- Inner: replaces the existing pupil outline, opacity `0.10`

### FIX 6 — Arrow-key movement
`useEffect` adds a `window` `keydown` listener. Map `ArrowUp/Down/Left/Right` to `move(0,-STEP) / (0,STEP) / (-STEP,0) / (STEP,0)`, `e.preventDefault()` on match. Cleanup on unmount. Reuses the same `move()` function as the D-pad → identical collision, trail, camera, and feedback behavior.

### FIX 8 — Solid building obstacles
Build `OBSTACLES = [...TYPE_A, ...TYPE_B, ...TYPE_C]` once.
Modify `move(dx, dy)`:
1. Compute candidate `(nx, ny)` clamped to map bounds.
2. Check player-point against every obstacle rect inflated by 2px padding. If any hit → **cancel move** (return previous state, no trail push, no step).
3. If clear → push prev to trail, update player, then run Type A collision (89 → navigate, 23/47 → "Not yet.").

Note: Type A buildings remain non-enterable; touching them is detected by walking adjacent to them and the candidate rect intersecting (2px pad means players stop at the wall, which still counts as contact for response). To preserve A responses, run the A-rect contact check using the **candidate** point against A rects without the 2px pad **before** the obstacle block — if it would land inside A, treat it as contact (trigger response) and cancel the positional move. This way you can't enter an A building but bumping into it still fires the message / navigation.

Initial player spawn already sits on the outer ellipse, outside all buildings — no spawn collision possible.

### FIX 7 — Smooth camera (lerp via rAF)
- New refs: `cameraRef = { x, y }` (current camera, initialized to clamped target for initial player position) and `rafRef`.
- New state: `camera: { x, y }` for rendering.
- `useEffect` starts a single `requestAnimationFrame` loop:
  ```
  const targetX = clamp(view.w/2 - player.x, view.w - MAP_W, 0)
  const targetY = clamp(view.h/2 - player.y, view.h - MAP_H, 0)
  cameraRef.x += (targetX - cameraRef.x) * 0.12
  cameraRef.y += (targetY - cameraRef.y) * 0.12
  setCamera({ x: cameraRef.x, y: cameraRef.y })
  ```
  Loop runs every frame; when distance < 0.5px on both axes, snap and skip `setCamera` to avoid wasted renders (still keep rAF scheduled so next move resumes smoothly).
- Effect deps: `[player, view]`. Cleanup cancels the rAF.
- Map div uses `transform: translate(${camera.x}px, ${camera.y}px)` (no CSS transition — the lerp itself is the smoothing).

### Out of scope
No changes to `Door.tsx`, `App.tsx`, `ProfileSetup.tsx`, `EntityQuestions.tsx`, `Index.tsx`, or any other file. HUD, entity quote, D-pad layout, trail cap (50), and Type A visuals are unchanged.

