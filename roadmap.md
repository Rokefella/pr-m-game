# Roadmap

- [ ] Walkthrough: book minimum-flag gating, invisible start, foot/bump-only signposts, private maze notes, normal crate floor and corrected intro spiral; run tests, no database/sample data.

- [x] World player/presence labels and Sam-stage-three immediate title grant using existing users fields; all 545 tests pass. Signed-in desktop/phone labels and Profile checked; named sam_03_back grant regression-tested. No schema or sample-data changes.

- [x] Sam rework: stage-driven world homes, Lumen topics, open town doors, door_exchange, Instrument as unusable tool, Sam's land quest line, no Sam in mazes, old village removed. New preview account walked stages 0→3 and received the Instrument and coal; Lumen exchange and maze 1 checked.

- [x] Add dev-menu TOP-UP actions, server-balance HUD refresh and pre-grant world/maze save settling; existing RPC only.

- [x] Walkthrough #9/#15/#22–#25: grouped stacks/quantity use, world Map Scrap discovery/marker, shared terrain and building motion, immediate inventory refresh and ice sliding/NPC avoidance. All 525 tests pass; controlled desktop/phone preview checks cover stack use/HUD, world reveal, open wardrobe refresh and four-cell ice slide/blocked stop. No database changes.
- [ ] Verify new stack/Map Scrap RPC persistence and gifts as Rob — external game auth is unavailable; controlled preview responses do not establish live persistence.

- [x] Walkthrough notes #3–#7: collect-before-use drops, words/cairn claims and receipts, drop-first Folder/global resource use with HUD refresh, start flag without label, Gods sprites/rectangular ship/water underlays and layout version 4. Controlled desktop/phone claim/use/re-read flows and all 24 real public terrain sprites checked; no tables, migrations or sample data.
- [ ] Verify Rob's live find claims and resource consumption — the game uses external authentication; no authenticated game session is available and the managed service has no mintable users. Controlled responses do not establish live persistence.

- [ ] Repair NPC card taps and portraits; calm deterministic one-tile wandering, three-tile proximity stops and talking freeze; verify Sam topics and stage advancement.

- [x] Add registration-one dev notepad, screenshot capture, live context, Dev Menu controls and focus-safe walking; existing RPCs only. Real canvas/HUD JPEG capture and isolated desktop/phone save/edit/drop checked; all 479 tests pass.
- [ ] Verify dev-note persistence as Rob in the real game — the game uses external authentication without a available signed-in session; isolated RPC checks do not establish live saving.

- [x] World build: anchor buildings and depth/fade, character glow, shared player presence, deterministic wandering NPCs, Sam copy, and confirmed GO BACK TO START; existing data only. Today's public world and phone confirmation checked without page errors; game regressions pass.
- [ ] Verify new buildings after map rebuild and multiplayer/reset against a real signed-in account — new chunks await the user's rebuild; external game auth cannot be minted by the connected backend.

- [x] Player skins: Visitor default suit, dye zones, walk frames, wardrobe with hidden unfound skins, skin-found cards for world finds and maze pickups, dev grant; frame/colour/privacy/orb-event tests pass.
- [ ] Verify skin equip, finds and maze skin drops against a real signed-in player — the avatar_skins table and skin RPCs were not visible through the backend tools, and external game authentication remains unavailable.

- [x] World home build 2: fractional step spending, bounded serialized lifecycle flushes, zero-step slow walking and shared real merchant; spending/refetch/leave and purchase tests pass, preview compilation passes.
- [ ] Verify build 2 walking deductions and merchant purchases against a real signed-in player — the game's external authentication session is unavailable; automated mocked flows pass but do not verify live persistence.

- [x] World home build 1: normal destinations, effective level/Sam gates, shared HUD/dev menu/arrival card, daily gift and player refresh; Village retained and walking session-only. All 416 tests pass; isolated desktop/phone panels and signed-out routing checked.
- [ ] Verify World home rewards, daily gift and level arrival against a real signed-in player — external game authentication unavailable; managed session minting has no users.

- [x] Add visible shared water/fire animation, cached wind frames and decorative night fire light; regression tests and real published-sprite desktop/phone rendering verified, including static reduced motion. Real signed-in gameplay remains unavailable under the existing external-auth limitation.

- [x] Add shared terrain variants, world-only 2×2 boulders and ground height shading; 366 tests and preview compilation pass. Existing forest data checked at desktop/phone sizes without page errors; actual signed-in gameplay remains unavailable as documented below.

- [x] Add fogged world map with cached overview, zoom/pan, discovered places and nonblocking per-user discovery persistence; 360 tests and preview typecheck pass. Desktop/phone public-data map, zoom/reveal/close checked without page errors.
- [ ] Verify discovery saves against a real signed-in game account — external game authentication is unavailable; persistence is regression-tested but not live-account verified.

- [x] Update /world neighbour ground, terrain-paced wading/ripples, Bernard/merchant cards and versioned safe arrivals; 350 tests pass and preview compilation passes. Existing public forest data and Bernard tap/Close card verified at 375px without page errors.
- [ ] Verify forest changes in a real signed-in session — the game uses separate external authentication; managed auth has no users to mint, so isolated public-data checks do not verify signed-in gameplay.

- [x] Add shared world/maze tile drawing, deterministic era skins and accent loading presentation. 335 tests pass, preview compilation passes; published skins 1, 4 and 7 render at desktop/375px, with shared drawer identity and Cinder Hollow · Fire loader verified without page errors.
- [ ] Verify era skins during a real signed-in maze run — the game's separate external authentication is unavailable; published-data rendering and gameplay regression tests do not verify the live account flow.

- [x] Correct DynamicRoom/Exchange room NPC body sizing using visible player width rather than glow canvas; preserve legacy dot sizing and village/maze. 39 focused tests pass, preview compilation passes, and isolated rendering measures Bernard/Banker/Keeper at 1.132 times the player body with no page errors; real signed-in room checks remain unavailable as noted below.

- [x] Shrink Perception-scaled maze light, remove dye wardrobe and refresh consumed dyes, unify game layers and hide orb labels during UI. 254 tests and preview compilation pass; controlled browser checks verify Profile/sheet label hiding, world hiding behind Profile, Growth note and two repeated dye uses removing both drops and changing the header orb.
- [ ] Verify smaller maze light and dye consumption against a real player — the game uses separate external authentication unavailable to the checker; controlled data does not verify server persistence.

- [x] Add maze-only Echo ghosts with size-based/override counts, BFS-safe spawns, smooth non-reversing corridor movement and fog-aware title opacity driven by Maze's frame loop. 246 tests and preview compilation pass; isolated browser checks using published Level 1 geometry show 3 Echoes, moving transforms and hidden bodies/titles outside light, with no page errors.
- [ ] Verify Echoes during real signed-in gameplay — external game authentication is unavailable; published geometry and isolated rendering do not establish the live player flow.

- [x] Repair Bernard stage 3 → 4 after banking/on every Village load from shadow_visited or Library; preserve existing title until its reward unlocks. Published quest/stage/book records audited; 231 tests pass, including cleared-progress action spine through stage 6 and Village 2 hand-in; preview compilation passes.
- [ ] Verify Bernard FULL RESET → stage 6 with a real player — external game authentication is unavailable; published records and simulated action tests do not establish live persistence.

- [x] Resize NPC body widths to rounded screen avatar × 1.15, add dialogue names and portal all orb labels into a fixed-size screen-space overlay; 216 tests and preview compilation pass. Isolated desktop/375px checks verify Lucretius stays 23.75px wide at zoom 1/1.5/2, ghost movement tracking, fixed gaps and reduced motion.
- [ ] Verify NPC sizes and table-backed names in real signed-in screens — the game's external authentication session is unavailable; isolated art does not verify live player data.

- [x] Add shared dialogue-aligned NPC quest states, event-driven refresh, and gold/grey/green orb markers across game screens; 212 tests and preview compilation pass; isolated desktop/375px and static reduced-motion checks pass.
- [ ] Verify quest acceptance and hand-in markers in real signed-in gameplay — the game's external authentication session is unavailable; isolated checks do not verify published gameplay.

- [x] Read Weaver's top-level village streetStyle and pass it to cached terrain artwork, defaulting missing/invalid metadata to cobble; preserve gameplay geometry.

- [x] Replace village streets with switchable cobble/plates/brick patterns, merged exposed edges and brick-only lamps; layout/collision/camera unchanged. 195 tests and preview compilation pass; isolated artwork verifies all three styles, clean junctions, brick-only lamps and reduced motion.
- [ ] Verify paths in the real signed-in Village — the game's external authentication session is unavailable; isolated artwork checks do not verify the published layout.

- [x] Add attached title/name labels to player and authored ghost orbs, retaining sizes, movement and fog layering; 190 tests and preview compilation pass. Isolated desktop/375px checks verify Glorious/Marcel, optional labels, stable moving offsets and pointer pass-through.
- [ ] Verify orb labels on real signed-in game screens — the game's external authentication session is unavailable; isolated checks do not verify real profile data or fog placement.

- [x] Match ghost/player orb sizes and add ref-driven radius-five wander, straight-path patrol and current-position whispers; 189 tests and preview compilation pass. Isolated 375px/desktop checks verify matching 25px sprites, street patrol, wandering and static reduced motion; real-account gameplay verification remains blocked as noted below.

- [x] Add authored fresh-arrival SPAWN positions and pass-through titled ghosts with proximity whispers in Village, Maze, Shadow Realm and all room screens; radius/cooldown regression tests and compilation pass; isolated 375px/desktop art and static reduced motion verified.
- [ ] Verify authored arrivals, ghost proximity and fog placement on real signed-in game screens — the game's separate external authentication session is unavailable; isolated artwork checks do not verify live gameplay.

- [x] Replace NPC drawings with identity-coloured pixel orbs while retaining movement and interaction handlers; 171 tests and preview compilation pass, with all eleven identities and reduced-motion art checked at 375px.
- [ ] Verify NPC placement and interactions on real game screens — the game's separate external sign-in session is unavailable; the isolated orb preview does not verify live gameplay.

- [x] Fix Shadow transfer counters to use only the current snapshot and query the saved Library total; seven focused tests and preview compilation pass, with saving and level gates unchanged.
- [ ] Verify Shadow transfer totals against a real player's Library — the game's separate external sign-in session is unavailable.

- [x] Replace step-roll drops with server-filled run placements and lit/dim crates; 154 tests pass, preview compilation passes, and isolated desktop/375px walkthrough verifies fresh fills, key/drop grants and dimming, Console Room preservation, rerolls and static reduced motion.
- [ ] Verify real published-maze drop placement, claiming and carried-key exclusion — external game authentication is unavailable.

- [x] Replace Index, Maze, Village, DynamicRoom and ExchangeRoom initial loading placeholders with the shared Instrument spiral; 144 tests pass, timing tests verify 150ms no-flash/500ms hold, browser checks verify all five loaders and static reduced motion, and preview compilation passes. ShadowRealm's entry guard and the already-usable Intro/ProfileSetup stay unchanged because they have no blocking data-loading placeholder.

- [x] Show carried-only Folder/reveal counts with a separate Library total; restyle every Profile tab in Instrument plates without changing handlers or banking; 140 tests pass and isolated 375px checks verify all tabs, 1/20 carried, Library 5 banked and reveal Folder 1 of 20.
- [ ] Verify carried-only Folder and Library totals against a real account — the game's external sign-in session is unavailable; isolated checks are not live persistence verification.

- [x] Restyle ConsolePanel with eight tiles, plated keypad, carried-drop key socket and server-selected key; 27 focused tests and preview compilation pass; isolated 375px/desktop checks verify one-row tiles, key selection, READY, wrong-key removal and close. Real account verification remains blocked by the external game session as noted below.

- [x] Format all visible fragment primes to at least five digits without changing stored values or gameplay; 21 tests and preview compilation pass, and isolated prime-2 reveal/save at 375×667 shows 00002 without wrapping (live authenticated Folder/Exchange reads remain unverified).

- [x] Restyle Login and Signup in Instrument plates, with readable inputs, password toggles and existing auth destinations.
- [x] Verify 375×667 phone layouts without scrolling, independent SHOW/HIDE controls, mapped errors and no-session signup confirmation using simulated auth responses; six navigation tests and build pass.
- [ ] Verify real signup email delivery and hosted confirmation settings — the game's external auth service is not managed by this project's Cloud tools.

- [x] Replace numbered Village buildings with coloured door entrances, preserving gates and legacy fallback; add safe door-specific returns.
- [x] Test four-direction door zones, refused gates, fallback precedence and safe return placement (26 tests); isolated browser checks pass for twelve approaches/returns, refusal latch/retry, legacy Village 2 doors and 375px preview.
- [ ] Verify door entry and returns with a real player's account — the game's external sign-in session is unavailable; isolated checks do not establish live persistence.

- [x] Fix maze run lifecycle with explicit exits, twelve-hour resumption and Shadow transfer completion; preserve room round trips and gameplay rendering/movement.
- [x] Test all five deliberate exits, room-return resumption and twelve-hour limits (21 new tests); isolated browser scenarios a–d pass with no runtime errors, including actual Bernard door navigation and full Shadow transfer.
- [ ] Verify scenarios a–d against a real player's stored fragments — the game uses external auth without an available session; isolated checks do not establish live persistence.

- [x] Replace avatar aura rings with a pulsing pixel orb; preserve palette API and caller positioning.
- [x] Verify 64 previews across four colours, 24/30/48/96 pixels, idle/walking and both backgrounds at 375px and desktop; pulse, alternating feet and reduced motion pass, with six related tests and build OK.

- [x] Add reusable pixel plate, eye, decoding number and folder slots; restyle FragmentOverlay without gameplay changes.
- [x] Test reveal timing/count rules (14 tests) and verify isolated pickup/save at 375×667 and 375×500, six-digit primes, reduced motion and unchanged save callback; build passes.
- [ ] Verify live fragment folder query and pickup persistence — the game's separate auth session is unavailable; isolated fixtures are not live verification.

- [x] Integrate Instrument Village ground, streets, trees, plazas and buildings without gameplay changes.
- [x] Test neighbour rules (15 theme tests pass) and verify isolated Village 1/2 70×70 layouts at 375px, four-digit HUD balances, camera scrolling and reduced-motion beacons.
- [ ] Verify actual signed-in Village 1/2 layouts and real-device scrolling — no game auth session is available; isolated map checks do not establish real-device performance.

- [x] Add session-once daily step claims with fresh-row synchronization before step writes.
- [x] Add ACCOUNT feedback sheet with nonempty submissions and keyboard-safe phone layout.
- [x] Seven beta rule tests pass; both flows verified with isolated data at 375px, including a keyboard-sized visible area.
- [ ] Verify real daily grants and feedback persistence — managed auth has no accounts to mint, and the game's separately configured auth session is unavailable.

- [x] Integrate Instrument floor/walls and memoized object visuals into Maze with preserved gameplay and HUD.
- [x] Verify culling, theme rules, daylight visibility and shard/gate interactions at 375px using isolated fixtures; 13 tests and build pass.
- [ ] Verify live signed-in maze pickups and door navigation — blocked because auth has no accounts to mint a session for.

- [x] Add isolated Instrument tile foundation, six wall/floor styles, and public /tiles preview without gameplay changes.
- [x] Test spiral/theme rules (10 passing tests) and verify preview controls at 375px and desktop widths; build passes, with existing preview ref warnings remaining.

- [x] Add the single beta switch and bypass every subscription/paywall gate without changing stored subscriptions.
- [x] Verify beta access and unchanged subscription behavior with the switch disabled (9 tests); confirm direct paywall navigation is bypassed.
- [ ] Verify signed-in game access end-to-end — blocked because the connected auth service has no users to mint a session for.

- [x] Upgrade Shadow Realm walls to red-shadow beveled tiles.
- [x] Add nearest-open-cell spawn safety and rounded wall collision keys.
- [x] Verify the focused Shadow Realm source changes.

- [x] Add Console Door maze round trips, shared Console Room, server-validated keypad and temporary rift card; 135 tests and preview compilation pass; isolated 375px/desktop walkthrough verifies wrong codes, countdown, silent answer, rift and exact-cell fragment-preserving return.
- [ ] Verify console codes, keys and unlock persistence against a real player's published maze — the game uses a separate external auth session unavailable to the checker; isolated tests are not live server verification.

- [x] Dyes: any-colour orb, consume-only USE dye sheet and live orb updates; wardrobe removed.
- [x] World visitors use the existing position row's skin, dye, facing and layer; nearby sprites and distant/map dots implemented.
- [ ] Verify consume-only dye USE on a real account — the game sign-in is unavailable to the checker.

- [x] Make all ten mechanic drops usable; refresh steps/run state and draw run effects with reduced-motion support. Consumption tests and controlled browser cue checks pass.
- [ ] Verify mechanic consumption and effects against a real player — separate game authentication is unavailable; mocked consumption and controlled cue checks cannot establish live persistence.

- [x] Add dev-only read-only /world-test canvas sandbox, cached world chunks, movement, places, jump menu and clock phases. Real public world data renders at 25,25 and The Prime Node; Cinder Hollow ENTER loads a local Level 1 preview without writes.
- [ ] Verify /world-test through the real dev account menu — separate game authentication is unavailable; fetched-registration gating and read-only behavior are tested, not signed-in end-to-end.

- [x] Mark run drops carried, abandon them on real exits after pending claims, refresh inventory and snapshot Shadow banked-drop counts. Tests and controlled phone inventory checks pass.
- [ ] Verify pickup → exit/re-entry and Shadow banking on a real game account — external game authentication is unavailable; controlled inventory checks cannot verify server persistence.
