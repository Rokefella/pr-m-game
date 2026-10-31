# PRÆM code audit (report only, no changes)

The latest build is clean. 78 test files, about 25.8k lines of app code. Line numbers are approximate. Items marked "verify" are likely problems that I haven't fully traced yet.

## Findings, by impact

1. **Dev powers checked only in the browser** (data access/security). The dev checks `registration_number === 1` in `WorldTest.tsx` ~119/618, `Maze.tsx` ~1666/1677, `DevMenu.tsx` ~74, `ShadowRealm.tsx` ~91 (force garden via localStorage), and the DevNotepad gate. Risk: if the backend functions behind DEV top-up, FULL RESET, grant-all-skins and go-back-to-start don't check the caller themselves, any player can call them. Fix: audit each dev function and require registration 1 on the server; treat the client checks as hiding only. Effort: M.

2. **Client writes to game state on `users`** (correctness/cheating). Examples: `Maze.tsx` ~1121 (steps_remaining) and ~1586 (maze_completed_level), `WorldTest.tsx` ~611 (level, social, title on level-up) and ~308 (title), `ProfileOverlay.tsx` ~547/813, `userData.ts` ~86 (generic patch), `purchase.ts` ~26-48. Risk: progression, steps and level can be set from devtools, and the step write in Maze overwrites any server grant that lands at the same moment. Fix: move these into RPCs (`spend_maze_steps`, `complete_maze`, `apply_levelup`, `set_title`), then limit what players can update on their own row to cosmetic columns. Effort: L.

3. **Maze.tsx is 1707 lines doing everything**: loading, movement, drops, mechanics, Echoes, exits/banking, HUD and dev. Risk: the regression-heavy area (run forfeiture, step saves) is hard to change safely. Fix: split out `useMazeRun` (runState and exits), `useMazeSteps` (sharing the WorldSteps ledger, see 4), `useMazeDrops`, `useMazeMechanics` and a `MazeCanvas` view. Effort: L.

4. **Two step ledgers**. /world uses `worldSteps.ts` (fractional spending, batched saves). The maze uses its own `enqueueSave('steps', …)` with an absolute write. Risk: the two behave differently, and the absolute write can erase a top-up or daily gift. Fix: one ledger for both screens, sending only changes to `spend_world_steps`. Effort: M.

5. **Other large screens**: `ProfileOverlay.tsx` 1174, `DynamicRoom.tsx` 1124, `ExchangeRoom.tsx` 1080, `ShadowRealm.tsx` 861, `LibraryRoom.tsx` 675, `useNpcDialogue.ts` 533. Fix: split Profile into separate Folder, Wardrobe, Quest log and Titles parts. Split Exchange into listings and sell parts with their data. Move the dialogue condition and action logic in `useNpcDialogue` into `npcQuestState`/`worldSam` (it is currently partly duplicated, see 9). Effort: M each.

6. **Old village leftovers** (dead code):
   - Unused files: `src/assets/bernard.png`, `public/village.png`, `public/door.png` (no references).
   - Likely dead (verify): the marker SVGs `src/assets/*_marker.svg` (only bernard_marker is referenced, in one place); `theme/VillagePatternTile.tsx`, `theme/BuildingBlock.tsx`, `lib/theme/villageRendering.ts`, `lib/theme/buildingCanvas.ts`, `objects/VillageDoor.tsx` (only reference each other or the theme index); `bernard_stage` in `questFlags.ts`/`npcQuestState.ts`; Bernard/purple branches in `merchantItems.ts`, `LevelUpCard.tsx`, `orbSizes.ts`.
   - Redirect-only routes still in `App.tsx` ~46-66: `/village`, `/bernard-room`, `/world-test`, `/welcome`. Keep them as redirects, remove the code behind them.
   - Preview routes open to everyone: `/tiles`, `/avatar-preview`, `/garden-preview`.
   - Fix: delete in one pass, run tests, and prune the AGENTS.md lines and memory notes that still mention village/Bernard (for example the "Village paths" and "Bernard progression" memories).
   - Effort: S-M.

7. **Exchange reads the user's own row in several places** (`ExchangeRoom.tsx` ~142, `ProfileOverlay`, `FragmentOverlay` ~78, `DropDetail` ~84, `DevNotepad` ~18, `Index` ~44, `subscriptionStatus`, `PaywallOverlay`). These are allowed under own-row rules, but each screen fetches `users` separately, often with `select('*')`. Risk: repeated network calls per screen, and stale balances between them. Fix: one shared `usePlayer()` store with balances (refreshed by the existing inventory/balance events), and narrow column lists. Effort: M.

8. **No route code splitting**. `App.tsx` imports all 28 pages up front, including Paywall (590), the preview screens and Shadow Realm. Risk: slow first load on phones. Fix: `React.lazy` per page with the existing LoadingScreen as fallback. Effort: S.

9. **Duplicated logic between /world and the maze/rooms**: HUD balance refresh, dev menu wiring and settle-before-grant calls, NPC card launch (`SamCard` vs `NpcDialogue` with `useNpcDialogue`), item USE (`ProfileOverlay` vs `DropDetail`), and `has_drop` checks in both `worldSam.ts` and `npcQuestState.ts`. Fix: one condition evaluator, one "use item" helper and one `useGameShell` hook (HUD, dev menu, settle-saves). Effort: M.

10. **Timers and listeners**. `Thumbstick.tsx` has 16 add/remove listener pairs, Maze 9, WorldTest 8, netQueue 5. The world clock, wind and fire run on the 30 fps loop even when nothing animates in view. Risk: battery drain on phones, and leaks if a cleanup was missed (verify each pair). Fix: check that every listener is removed; pause loops when the tab is hidden (`visibilitychange`) and when no animated tile is on screen. Effort: S-M.

11. **World rendering cost**. Chunks are cached, but buildings are drawn as separate DOM canvases, the glow filter is an SVG blur with CSS animation (expensive on mobile), and chunks scan 3 cells beyond the screen. Fix: measure on a mid-range phone first; consider drawing glow once into a cached canvas, and limit how many building canvases exist at once. Effort: M.

12. **Daily features and time zones**. The Shadow garden door uses the player's local `new Date().getDate() === 23` (`ShadowRealm.tsx` ~92), while daily claims and fire rest are decided on the server (likely in UTC). Risk: the door opens on a different day than the server allows, and "rested today" doesn't match the player's clock. Fix: get "today" from the server and use one time zone everywhere. Effort: S.

13. **Flags compared as strings vs numbers**. Quest flags are text. Code mixes exact matches, "at least" (`flags_equal`) checks, and `Number()` reads (`sam_stage`, `fires_lit`). Risk: `"10" < "4"` style bugs and `"0"` vs a missing flag. Fix: one `flagNumber(flags, key)` helper and one comparison function used by every caller, with tests. Effort: S.

14. **Claiming twice**. Finds, drops, fire rest and Sam stages are claimed through server RPCs (good), but buttons don't always lock while waiting (verify `FindCard`, `SamCard`, `MerchantOverlay` sell). Risk: double taps produce duplicate requests and a confusing message, and double grants if any RPC isn't safe to repeat. Fix: lock buttons while waiting, and confirm each RPC ignores repeats. Effort: S.

15. **Errors handled silently**. Some pages ignore `{ error }` (for example `ExchangeRoom` ~141, Maze ~1586 `await update` without a check). Risk: the player loses progress with no message. Fix: show a message or retry wherever a save fails. Effort: S.

16. **Test gaps**: no end-to-end test across Sam stages 0-8, no test where merchant sell fails on the server, no tests for the maze era sprite fallbacks per era 2-8, and no test of the maze step ledger racing with a grant. The `Maze.test.tsx` and `WorldTest.test.tsx` suites mock heavily and are the slowest (verify timing). Fix: add rule-level tests for these. Effort: M.

17. **Look and feel consistency**. Cards use mixed font sizes and DM Mono vs Fell for buttons. Some small buttons (map markers 12px, notepad buttons, count pickers) are below the 44px touch target. Reduced motion is handled for terrain and doors but not checked for glow pulses on all screens. Fix: shared card styles, a minimum hit area on small markers, and a reduced-motion check. Effort: S-M.

18. **Leftover shadcn UI files** (`sidebar.tsx`, `chart.tsx`, `carousel.tsx`, `menubar.tsx` and others) are likely unused (verify). Fix: delete the unused ones. Effort: S.

## Do first (top 10)
1. Server-check every dev function (1).
2. Replace the maze's absolute step write with the shared ledger (4, 2).
3. Move level-up, maze completion and title writes into RPCs (2).
4. Lazy-load pages (8).
5. Delete the unused village assets and code, and prune stale notes (6, 18).
6. Lock claim and sell buttons while waiting (14).
7. Use the server's date for the garden door (12).
8. One flag-number helper (13).
9. Show messages for failed saves (15).
10. Start splitting Maze.tsx with `useMazeRun`/`useMazeSteps` (3).

## How each fix would be checked
Each step runs the full test suite and a preview walk of /world and maze 1. Database changes (items 1-2) need your approval as separate builds.
