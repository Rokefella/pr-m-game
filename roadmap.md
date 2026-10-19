# Roadmap

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
