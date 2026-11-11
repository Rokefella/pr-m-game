# src/lib rules

- worldFinds renders looted debris as static dim husks; terrainTile shares meteor smoke across cell and anchor sprites, and decorative glow light uses spriteLight without changing visibility or collision.

- skins.ts owns the avatar_skins catalogue cache, lift_boot_v1 frame derivation and dye ramps; PlayerAvatar renders SkinSprite and falls back to LegacyOrb without catalogue data, with the equipped skin shared through the orb event and module store so rooms need no prop threading. Unfound skins never render names or where_note. kind 'npc' rows (matched by npc_key) dress NPCs through NpcOrb — never dyed, blink/bob via NpcSkinSprite, facing toward an adjacent player in /world — and are excluded from the wardrobe, found-skin cards and grants; missing or disabled NPC rows keep the legacy orb.
