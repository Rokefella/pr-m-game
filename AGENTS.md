# Architecture rules

- Format fragment primes only at presentation boundaries through `src/lib/format.ts`; decoding consumes its formatted string so timing includes padding while persisted values and gameplay comparisons remain numeric.
- Derive carried and Library presentation counts from persisted banking status via `fragmentInventory`; reveal pre-count excludes the current prime only among carried rows so banked replays cannot skew it.

- Keep tile-theme rendering isolated in theme modules: cache SVG background URIs for memoized walls and a single repeating floor layer, with one optional prime overlay; this preserves gameplay camera performance when themes are integrated later.
- Maze camera transforms are written through a DOM ref; memoize visible themed cells by logical player cell and viewport size, retaining the existing culling margin to avoid per-frame grid scans.
- Village themes use one repeating floor, cached background images for streets/trees, and one SVG per building footprint; neighbour indexes are memoized by loaded layout and existing DOM-ref camera/culling remain unchanged to keep large villages smooth.
- Keep village entrance geometry, legacy precedence and safe-return search in villageDoors; Village owns flags, gates and navigation, using the same memoized door collection for movement, spawning and culling to prevent divergent entrance zones.
- Published theme/object metadata stays presentation-only except explicitly authored CONSOLE_DOOR interaction geometry, which the loader marks walkable; do not infer collision or pickups from decorative cells.

- Keep the reversible beta subscription bypass in `src/lib/config.ts`; gate subscription access and paywall entry points without modifying stored entitlement data so disabling it restores the original behavior.

- Coordinate daily step claims through one per-user in-memory session promise; Village publishes a refreshed balance and Maze waits before loading or writing steps to prevent stale balances overwriting grants.
- Render ACCOUNT feedback through a portaled modal sized against the visual viewport; keyboard resize must keep the message and submission controls visible.
- Keep fragment plate primitives presentation-only; coordinate eye, voice and digit readiness in FragmentOverlay, deriving pre-collection counts by excluding the current prime from the Folder query so asynchronous pickup persistence cannot skew the count.
- Keep player sprite art and CSS-only motion inside PlayerAvatar with its existing viewBox and origin; preview the same component directly so visual changes require no gameplay caller updates.
- Keep maze run records and unbanked deletion in runState; Maze owns awaited deliberate exits and captures room-return intent before config consumes coordinates, while successful Shadow persistence ends the run so banking never suppresses later forfeiture.- Room interiors (DynamicRoom, ExchangeRoom) render through components/theme/rooms: floor/wall cells merged into one CSS-background div per row run, implicit wall ring added to collision, avatar and camera written via DOM refs; keeps rooms cheap and visually consistent.
- Shadow Realm entry requires a recent sessionStorage entry token written by Maze's golden door and cleared only after a successful banking transfer; transfers persist before any animation, and a run marked completed at the golden door routes back to the Shadow Realm while unbanked fragments remain; its camera, lantern and above-fog garden beacon are written through refs in one rAF loop.
- Door screens and the Shadow-to-level transfer share components/theme/transition (GateScene + DoorTransition + TransitionFlash); pages stay thin wrappers that own only data and destinations, with CSS-only timing and reduced-motion fallbacks.
- Intro and ProfileSetup render through PlateFrame with sigils in components/theme/intro/PixelSigil; the username rule lives in ProfileSetup's exported nameError so it stays testable.
- Login and Signup share presentation-only AuthPlate and AuthField controls; pages retain auth calls and own navigation/confirmation state so visual changes cannot alter authentication behavior.
- ConsolePanel owns server validation, carried-drop selection and lockout display; pass the selected drop UUID to the server and keep key compatibility server-authoritative. DynamicRoom owns console bump blocking and placeholder rifts, and Maze reuses the existing exact-cell room-return marker to preserve runs.
