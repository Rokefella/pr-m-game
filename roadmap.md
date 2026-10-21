# Roadmap

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

- [x] Dyes: any-colour orb, USE dye sheet, ORB COLOUR wardrobe, live orb updates; 174 tests pass.
- [ ] Ghost players show the dye colour — the positions table has no colour column (needs a database change on the game server).
- [ ] Verify dye USE/wardrobe on a real account — the game sign-in is unavailable to the checker.
