# Architecture rules

- Keep the reversible beta subscription bypass in `src/lib/config.ts`; gate subscription access and paywall entry points without modifying stored entitlement data so disabling it restores the original behavior.