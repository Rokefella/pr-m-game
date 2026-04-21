

## Village Redesign — Updated Plan

Same top-down geometric Village screen as previously approved, with one addition: feedback message when the player touches Building 23 or 47.

### Addition to `src/pages/Village.tsx`

**Collision feedback for non-active buildings**

State: `feedback: { building: 23 | 47 | null }` (single slot — newest tap replaces previous).

After updating player position on tap, run collision checks in this order:
1. Building 89 rect (x ∈ [145, 245], y ∈ [90, 170]) → `setTimeout(navigate('/door'), 600)` (unchanged)
2. Building 23 rect (x ∈ [30, 110], y ∈ [240, 300]) → `setFeedback({ building: 23 })`, clear after 1500ms
3. Building 47 rect (x ∈ [280, 360], y ∈ [240, 300]) → `setFeedback({ building: 47 })`, clear after 1500ms

**Rendering**

Inside Building 23 and Building 47 boxes, below the numeric label:
- When `feedback.building === 23` (or 47), render a `<p>`:
  - Text: *"Not yet."*
  - `font-fell italic`, 10px, `color: rgba(160,140,200,0.5)`
  - `marginTop: 4`
  - Animation: `villageFade` keyframe (reused) `opacity 0.6 → 0` over 1.5s

Add to inline `<style>` block (extends existing keyframes):
```
@keyframes villageNotYet { 0% { opacity:.6 } 80% { opacity:.6 } 100% { opacity:0 } }
```
Use `villageNotYet 1.5s ease-out forwards` so the text holds briefly then fades.

Building label layout switches from centered-only to a small vertical flex column (label on top, feedback line below) so the "Not yet." text appears directly under the number without shifting the box.

### Everything else
Identical to the previously approved plan: pure black background, purple grid overlay, three building boxes, gold pulse on 89, glowing player dot with idle pulse, tap-to-move with 5-dot fading trail, MAZE STEPS counter, entity quote, HUD bar.

### Out of scope
No changes to `Door.tsx`, `App.tsx`, `ProfileSetup.tsx`, or any other screen.

