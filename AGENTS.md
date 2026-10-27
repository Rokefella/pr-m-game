# Architecture rules

- DevNotepad is a registration-one-gated app-level portal; devNotes stores drafts/settings and calls existing RPCs, while page ref getters supply current context without camera subscriptions. Capture lazy-loads html-to-image on body to include root canvases and portaled overlays, excluding notepad UI; capture-phase focus guards release held keys and suppress game shortcuts without disabling the game outside the panel.

- Maze loads drops after fresh/resume readiness. Real exits settle claims then runState abandons drops and refreshes inventory; Shadow snapshots carried counts before server banking. DropCrate only draws.

- LoadingScreen owns timing.

- Format primes only at presentation boundaries via format.ts; decode the padded string; persist and compare numbers.
- Derive carried counts via `fragmentInventory`, excluding the current prime for reveal pre-counts. Shadow progress uses only its transfer snapshot; query Library rows after persistence independently of level-gate timing to keep presentation from altering saving.

- Legacy tile themes cache SVGs; maze era skins use terrainTile shared with worldTestRender, deterministic mazeSkins rules and a viewport canvas ticked by Maze's camera loop. Skin metadata never changes geometry or lighting; missing skins retain legacy art.
- Maze camera transforms are written through a DOM ref; memoize visible themed cells by logical player cell and viewport size, retaining the existing culling margin to avoid per-frame grid scans.
- Village reads streetStyle from published layout data through the theme resolver and passes it to presentation-only terrain; cache street/tree backgrounds and building SVGs and memoize full-layout path indexes/merged exposed-edge runs to retain culling.
- Keep village entrance geometry, legacy precedence and safe-return search in villageDoors; Village owns flags, gates and navigation, using the same memoized door collection for movement, spawning and culling to prevent divergent entrance zones.
- Published theme/object metadata stays presentation-only except explicitly authored CONSOLE_DOOR interaction geometry, which the loader marks walkable; do not infer collision or pickups from decorative cells.

- Keep the reversible beta subscription bypass in `src/lib/config.ts`; gate subscription access and paywall entry points without modifying stored entitlement data so disabling it restores the original behavior.

- Daily claims share one per-user session promise; home pages refresh balances and Maze waits before step writes to avoid overwriting grants.
- Render ACCOUNT feedback through a portaled modal sized against the visual viewport; keyboard resize must keep the message and submission controls visible.
- Keep fragment plate primitives presentation-only; coordinate eye, voice and digit readiness in FragmentOverlay, deriving pre-collection counts by excluding the current prime from the Folder query so asynchronous pickup persistence cannot skew the count.
- Ghosts use caller walkability; Echoes use BFS/rAF; labels use portals. roomConfig sizes NPC bodies before zoom.
- Use zIndex's scale and data-game-ui markers to hide labels during UI; portal Profile to body to escape transforms. Preserve local world ordering.
- mazeLight owns radii; mechanics reads server run effects, DropDetail consumes via RPC and refreshes inventory/users; Maze draws effects through refs and settles step saves before grants.
- Keep maze run records and unbanked deletion in runState; Maze owns awaited deliberate exits and captures room-return intent before config consumes coordinates, while successful Shadow persistence ends the run so banking never suppresses later forfeiture.- Room interiors (DynamicRoom, ExchangeRoom) render through components/theme/rooms: floor/wall cells merged into one CSS-background div per row run, implicit wall ring added to collision, avatar and camera written via DOM refs; keeps rooms cheap and visually consistent.
- Shadow Realm entry requires a recent sessionStorage entry token written by Maze's golden door and cleared only after a successful banking transfer; transfers persist before any animation, and a run marked completed at the golden door routes back to the Shadow Realm while unbanked fragments remain; its camera, lantern and above-fog garden beacon are written through refs in one rAF loop.
- Door screens and the Shadow-to-level transfer share components/theme/transition (GateScene + DoorTransition + TransitionFlash); pages stay thin wrappers that own only data and destinations, with CSS-only timing and reduced-motion fallbacks.
- Intro/ProfileSetup share PlateFrame/PixelSigil; nameError stays exported for tests.
- Login/Signup share presentation-only AuthPlate/AuthField; pages own auth and navigation.
- ConsolePanel owns server validation, carried-drop selection and lockout display; pass the selected drop UUID to the server and keep key compatibility server-authoritative. DynamicRoom owns console bump blocking and placeholder rifts, and Maze reuses the existing exact-cell room-return marker to preserve runs.
- npcQuestState shares dialogue predicates; useNpcQuestStates caches event-driven results; NpcOrb only draws. questFlags reconciles Bernard after banking/on Village load from persisted progress, never level/session markers.

- /world is signed-in home; /village is dev-only via DevMenu. exitDestination always returns /world. GameHud/DevMenu/LevelUpCard serve both pages; callers own arrivals. World keeps layer caches and move-triggered places; WorldSteps owns fractional pending spend, serialized bounded RPC flushes and lifecycle saving so refreshes cannot erase local costs. merchantItems shares the Village/World catalogue; World settles spending before step purchases to avoid overwriting deductions.
- terrainTile caches base/variant sprites at footprint size with shared picking/flips. World chunks draw ground → height → objects, clipping even-anchored large sprites; sprite/building/neighbour changes invalidate cached art. terrainMotion owns clock/axis rules; cached motion frames draw above ground without changing movement; fire light follows tint.
- World object underlays resolve neighbouring ground in worldTestRender only, preserving maze skin fallback; worldTest owns terrain-paced movement and safe arrivals, while worldReturn versions local positions to discard obsolete layouts without data writes.
- worldDiscovery owns per-user OR-merged local/server bits and throttled saves; WorldMap uses cached worldOverview art and library zoom/pan, with reveal strictly presentation-only.
- worldSam owns show_when, Sam stage/topic rules and RPCs; worldFinds owns find visibility/claim rules; cards draw.
- worldBuildings owns anchor art/depth/fade; scene isolation keeps depth below the HUD. worldNpcMotion owns closed deterministic home-rooted edge schedules and proximity/talking freezes with continuous rejoin. World holds the open NPC identity in a ref, keys cards by identity and disables walking through NPC cards; Thumbstick excludes complete dialogs and releases active gestures on controls. NpcPortrait draws unanchored down frames or legacy fallback. worldPlayers owns presence/visitor filtering; WorldVisitor never subscribes to local outfit events. goBackToStart clears game-only state after its RPC; callers settle/stop lifecycle saves first.
- skins.ts owns the avatar_skins catalogue cache, lift_boot_v1 frame derivation and dye ramps; PlayerAvatar renders SkinSprite and falls back to LegacyOrb without catalogue data, with the equipped skin shared through the orb event and module store so rooms need no prop threading. Unfound skins never render names or where_note. kind 'npc' rows (matched by npc_key) dress NPCs through NpcOrb — never dyed, blink/bob via NpcSkinSprite, facing toward an adjacent player in /world — and are excluded from the wardrobe, found-skin cards and grants; missing or disabled NPC rows keep the legacy orb.
