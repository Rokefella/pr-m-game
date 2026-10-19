# Architecture rules

- Keep tile-theme rendering isolated in theme modules: cache SVG background URIs for memoized walls and a single repeating floor layer, with one optional prime overlay; this preserves gameplay camera performance when themes are integrated later.
- Maze camera transforms are written through a DOM ref; memoize visible themed cells by logical player cell and viewport size, retaining the existing culling margin to avoid per-frame grid scans.
- Published level theme/object metadata is presentation-only in the loader; never derive collision, pickups or navigation from the visual cell collection.

- Keep the reversible beta subscription bypass in `src/lib/config.ts`; gate subscription access and paywall entry points without modifying stored entitlement data so disabling it restores the original behavior.