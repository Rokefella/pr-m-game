## Shadow Realm wall and spawn fixes

1. Add a lightweight red-shadow wall tile treatment in `ShadowRealm.tsx`, using the existing maze bevel, gradient, seams, and depth pattern.
2. During published-layout loading, build the wall set first and move the logical player position to the nearest open grid cell only when the origin is blocked.
3. Normalize wall-coordinate keys through rounded integer coordinates for both layout construction and movement collision checks.
4. Verify the changed file and the Shadow Realm preview without altering other entities, gates, or transfer behavior.

### Technical details
- Keep `STEP = 40` and all existing cell-relative placement math.
- Search outward in square rings from `{x: 0, y: 0}` and update both `posRef` and `pos` to the first non-wall result.
- Change only `src/pages/ShadowRealm.tsx`.
