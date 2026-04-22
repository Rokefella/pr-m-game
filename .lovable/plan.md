

## Rebuild ShadowRealm.tsx as a recolored Village clone

Replace `src/pages/ShadowRealm.tsx` entirely with an exact duplicate of `src/pages/Village.tsx`, then apply scoped content/color/behavior swaps. No other files change.

### Steps

1. **Duplicate** the full current contents of `src/pages/Village.tsx` into `src/pages/ShadowRealm.tsx`. Rename the component export to `ShadowRealm`.

2. **Color swaps** (global find/replace within the file):
   - `rgba(100,80,160,*)` → `rgba(20,120,50,*)`
   - `rgba(91,79,212,*)` → `rgba(34,197,94,*)`
   - `#5b4fd4` → `#22c55e`
   - `rgba(169,140,255,*)` → `rgba(34,197,94,*)`
   - `rgba(160,140,200,*)` → `rgba(120,200,140,*)`
   - `#4a9eff` (Building 23) → `rgba(34,197,94,0.8)`
   - `#1d9e75` (Building 47) → `rgba(22,163,74,0.8)`
   - `#c8963a` (Building 89) → `#f97316`

3. **Building 89 — level exit**:
   - Label/border/text color stay `#f97316` after the swap.
   - On player collision, replace the `navigate('/door')` (or equivalent) call with the level-up sequence:
     ```
     const cur = Number(localStorage.getItem('praem_level') || '1');
     const next = cur + 1;
     localStorage.setItem('praem_level', String(next));
     localStorage.setItem('praem_levelup_pending', 'true');
     localStorage.setItem('praem_levelup_newlevel', String(next));
     setFadeOut(true);
     setTimeout(() => navigate('/village'), 800);
     ```
   - Reuse Village's existing fade-out overlay pattern; if absent, add a simple black fixed overlay animated to opacity 1 over 800ms.

4. **Building 23 & 47 whispers**: change message from "Not yet." to **"Not in this realm."** Keep all other whisper logic intact.

5. **Eye**: keep Village's eye implementation, size, tracking, idle drift untouched aside from the color swap (`#5b4fd4` → `#22c55e`, pupil fill becomes `#16a34a` where applicable). Replace the eye's spoken lines array with exactly:
   1. "You found the other side."
   2. "The entity knows you are here."
   3. "Come back on the 23rd."
   4. "You have always been here."

6. **Entity quote** (top banner): change `"Another one enters?"` → `"You are inside it now."`

7. **HUD bar**:
   - Left column: `"SHADOW"` in `rgba(34,197,94,0.6)`. Remove the steps element entirely from the left column.
   - Center: `"FRAGMENTS 5/5"` in `#f97316`.
   - Right: `"LEVEL {currentLevel}"` in `rgba(34,197,94,0.7)`.
   - Read `currentLevel` on mount: `Number(localStorage.getItem('praem_level') || '1')` into state.

8. **Movement — remove step gating**:
   - Delete `stepsRemaining` state, its initialization, the "tap to exchange" hint, the credits-exchange panel, and any movement guard that checks `stepsRemaining`.
   - Movement is unconditionally allowed (free exploration). All other movement code (target/lerp refs, d-pad hold-repeat, arrow keys, diagonal normalization, STEP=12) stays identical to Village.

9. **No other changes**: map size, building positions, camera lerp, d-pad layout, forest, atmosphere text, entry sequence, and eye mechanics remain exactly as in Village.

### Files
- Rewrite: `src/pages/ShadowRealm.tsx`
- No other files modified. Route `/shadow` in `App.tsx` already points here.

