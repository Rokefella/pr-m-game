# Step B: server-owned saves

- Replace all 17 specified save paths with the existing live functions; no schema changes or sample data.
- Use returned balances and inventory counts, keep repeat-tap guards, and show existing failed-save notices for unexpected refusals.
- Restrict flag saving to UI flags and the four allowed story keys; preserve the listed cosmetic and own-row exceptions.
- Run the full test suite, attempt the requested authenticated preview actions, and report every remaining direct write with locations.

## Technical details
- Extend the existing serverGame wrappers and migrate callers without changing movement, rendering, prices, rewards, or routes.
- Banking remains persistence-first; fragment claims keep client image generation and use server-returned IDs.
- If no authenticated game session is available, report live verification as blocked rather than creating a player.