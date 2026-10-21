# Architecture rules

- Maze loads server-owned drops after config/lifecycle readiness using its fresh/resume decision; ref placements and in-flight claims isolate failures from movement. DropCrate only draws.

- LoadingScreen/useMinLoading own timing; pages retain data/navigation state.

- Format fragment primes only at presentation boundaries through `src/lib/format.ts`; decoding consumes its formatted string so timing includes padding while persisted values and gameplay comparisons remain numeric.
- Derive carried counts via `fragmentInventory`, excluding the current prime for reveal pre-counts. Shadow progress uses only its transfer snapshot; query Library rows after persistence independently of level-gate timing to keep presentation from altering saving.

- Tile themes cache wall SVG URIs and one repeating floor layer plus optional primes; memoized cells preserve camera performance.
- Maze camera transforms are written through a DOM ref; memoize visible themed cells by logical player cell and viewport size, retaining the existing culling margin to avoid per-frame grid scans.
- Village reads streetStyle from published layout data through the theme resolver and passes it to presentation-only terrain; cache street/tree backgrounds and building SVGs and memoize full-layout path indexes/merged exposed-edge runs to retain culling.
- Keep village entrance geometry, legacy precedence and safe-return search in villageDoors; Village owns flags, gates and navigation, using the same memoized door collection for movement, spawning and culling to prevent divergent entrance zones.
- Published theme/object metadata stays presentation-only except explicitly authored CONSOLE_DOOR interaction geometry, which the loader marks walkable; do not infer collision or pickups from decorative cells.

- Keep the reversible beta subscription bypass in `src/lib/config.ts`; gate subscription access and paywall entry points without modifying stored entitlement data so disabling it restores the original behavior.

- Coordinate daily step claims through one per-user in-memory session promise; Village publishes a refreshed balance and Maze waits before loading or writing steps to prevent stale balances overwriting grants.
- Render ACCOUNT feedback through a portaled modal sized against the visual viewport; keyboard resize must keep the message and submission controls visible.
- Keep fragment plate primitives presentation-only; coordinate eye, voice and digit readiness in FragmentOverlay, deriving pre-collection counts by excluding the current prime from the Folder query so asynchronous pickup persistence cannot skew the count.
- Ghosts use caller walkability; Echoes use BFS/Maze rAF; labels use fixed-pixel portals. Retain NPC anchors; roomConfig converts visible player bodies to NPC sizes before shared zoom.
- Use zIndex's scale and data-game-ui markers to hide labels during UI; portal Profile to body to escape transforms. Preserve local world ordering.
- mazeLight owns Perception radii; DropDetail consumes via RPC, refreshes the row and publishes orb changes, never storing unlocks.
- Keep maze run records and unbanked deletion in runState; Maze owns awaited deliberate exits and captures room-return intent before config consumes coordinates, while successful Shadow persistence ends the run so banking never suppresses later forfeiture.- Room interiors (DynamicRoom, ExchangeRoom) render through components/theme/rooms: floor/wall cells merged into one CSS-background div per row run, implicit wall ring added to collision, avatar and camera written via DOM refs; keeps rooms cheap and visually consistent.
- Shadow Realm entry requires a recent sessionStorage entry token written by Maze's golden door and cleared only after a successful banking transfer; transfers persist before any animation, and a run marked completed at the golden door routes back to the Shadow Realm while unbanked fragments remain; its camera, lantern and above-fog garden beacon are written through refs in one rAF loop.
- Door screens and the Shadow-to-level transfer share components/theme/transition (GateScene + DoorTransition + TransitionFlash); pages stay thin wrappers that own only data and destinations, with CSS-only timing and reduced-motion fallbacks.
- Intro/ProfileSetup share PlateFrame/PixelSigil; exported nameError keeps username validation testable.
- Login and Signup share presentation-only AuthPlate and AuthField controls; pages retain auth calls and own navigation/confirmation state so visual changes cannot alter authentication behavior.
- ConsolePanel owns server validation, carried-drop selection and lockout display; pass the selected drop UUID to the server and keep key compatibility server-authoritative. DynamicRoom owns console bump blocking and placeholder rifts, and Maze reuses the existing exact-cell room-return marker to preserve runs.
- npcQuestState shares dialogue predicates; useNpcQuestStates caches event-driven results; NpcOrb only draws. questFlags reconciles Bernard after banking/on Village load from persisted progress, never level/session markers.
