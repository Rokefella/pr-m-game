# Architecture rules

- Keep tile-theme rendering isolated in theme modules: cache SVG background URIs for memoized walls and a single repeating floor layer, with one optional prime overlay; this preserves gameplay camera performance when themes are integrated later.

- Keep the reversible beta subscription bypass in `src/lib/config.ts`; gate subscription access and paywall entry points without modifying stored entitlement data so disabling it restores the original behavior.