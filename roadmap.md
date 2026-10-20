# Roadmap

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
