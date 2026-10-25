# Architecture rules

- Maze loads drops after fresh/resume readiness. Real exits settle claims then runState abandons drops and refreshes inventory; Shadow snapshots carried counts before server banking. DropCrate only draws.

- LoadingScreen owns timing; pages own data/navigation.

- Format primes only at presentation boundaries via format.ts; decode the padded string; persist and compare numbers.
- Derive carried counts via `fragmentInventory`, excluding the current prime for reveal pre-counts. Shadow progress uses only its transfer snapshot; query Library rows after persistence independently of level-gate timing to keep presentation from altering saving.

- Legacy tile themes cache SVGs; maze era skins use terrainTile shared with worldTestRender, deterministic mazeSkins rules and a viewport canvas ticked by Maze's camera loop. Skin metadata never changes geometry or lighting; missing skins retain legacy art.
- Maze camera transforms are written through a DOM ref; memoize visible themed cells by logical player cell and viewport size, retaining the existing culling margin to avoid per-frame grid scans.
- Village reads streetStyle from published layout data through the theme resolver and passes it to presentation-only terrain; cache street/tree backgrounds and building SVGs and memoize full-layout path indexes/merged exposed-edge runs to retain culling.
- Keep village entrance geometry, legacy precedence and safe-return search in villageDoors; Village owns flags, gates and navigation, using the same memoized door collection for movement, spawning and culling to prevent divergent entrance zones.
- Published theme/object metadata stays presentation-only except explicitly authored CONSOLE_DOOR interaction geometry, which the loader marks walkable; do not infer collision or pickups from decorative cells.

- Keep the reversible beta subscription bypass in `src/lib/config.ts`; gate subscription access and paywall entry points without modifying stored entitlement data so disabling it restores the original behavior.

- Coordinate daily step claims through one per-user in-memory session promise; Village publishes a refreshed balance and Maze waits before loading or writing steps to prevent stale balances overwriting grants.
- Render ACCOUNT feedback through a portaled modal sized against the visual viewport; keyboard resize must keep the message and submission controls visible.
- Keep fragment plate primitives presentation-only; coordinate eye, voice and digit readiness in FragmentOverlay, deriving pre-collection counts by excluding the current prime from the Folder query so asynchronous pickup persistence cannot skew the count.
- Ghosts use caller walkability; Echoes use BFS/rAF; labels use portals. roomConfig sizes NPC bodies before zoom.
- Use zIndex's scale and data-game-ui markers to hide labels during UI; portal Profile to body to escape transforms. Preserve local world ordering.
- mazeLight owns radii; mechanics reads server run effects, DropDetail consumes via RPC and refreshes inventory/users; Maze draws effects through refs and settles step saves before grants.
- Keep maze run records and unbanked deletion in runState; Maze owns awaited deliberate exits and captures room-return intent before config consumes coordinates, while successful Shadow persistence ends the run so banking never suppresses later forfeiture.- Room interiors (DynamicRoom, ExchangeRoom) render through components/theme/rooms: floor/wall cells merged into one CSS-background div per row run, implicit wall ring added to collision, avatar and camera written via DOM refs; keeps rooms cheap and visually consistent.
- Shadow Realm entry requires a recent sessionStorage entry token written by Maze's golden door and cleared only after a successful banking transfer; transfers persist before any animation, and a run marked completed at the golden door routes back to the Shadow Realm while unbanked fragments remain; its camera, lantern and above-fog garden beacon are written through refs in one rAF loop.
- Door screens and the Shadow-to-level transfer share components/theme/transition (GateScene + DoorTransition + TransitionFlash); pages stay thin wrappers that own only data and destinations, with CSS-only timing and reduced-motion fallbacks.
- Intro/ProfileSetup share PlateFrame/PixelSigil; exported nameError keeps username validation testable.
- Login and Signup share presentation-only AuthPlate and AuthField controls; pages retain auth calls and own navigation/confirmation state so visual changes cannot alter authentication behavior.
- ConsolePanel owns server validation, carried-drop selection and lockout display; pass the selected drop UUID to the server and keep key compatibility server-authoritative. DynamicRoom owns console bump blocking and placeholder rifts, and Maze reuses the existing exact-cell room-return marker to preserve runs.
- npcQuestState shares dialogue predicates; useNpcQuestStates caches event-driven results; NpcOrb only draws. questFlags reconciles Bernard after banking/on Village load from persisted progress, never level/session markers.

- WorldTest at /world requires sign-in; draws one layer (surface/underground chunk caches); place actions fire only on a move. Exits that normally go to /village use worldReturn.exitDestination so trips from /world return there; walking stays session-only.
- terrainTile owns the sprite cache (icon_svg rasterised to 16×16, smoothing off) and the one cell drawer for /world and maze skins; /world caches static art per chunk canvas (WeakMap on chunk data, redrawn on sprite/building/neighbour changes) and draws moves overlays per frame on top.
- World object underlays resolve neighbouring ground in worldTestRender only, preserving maze skin fallback; worldTest owns terrain-paced movement and safe arrivals, while worldReturn versions local positions to discard obsolete layouts without data writes.
- worldDiscovery owns per-user OR-merged local/server bits and throttled saves; WorldMap uses cached worldOverview art and library zoom/pan, with reveal strictly presentation-only.
