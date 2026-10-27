import NpcOrb, { npcOrbIdentity } from '@/components/theme/objects/NpcOrb';
import SkinSprite from '@/components/SkinSprite';
import { npcColors, npcSkin, useSkins } from '@/lib/skins';
import './npc-portrait.css';

/** Portraits have no world anchoring, halo or quest-marker geometry. */
export default function NpcPortrait({ npc }: { npc: string }) {
  useSkins();
  const skin = npcSkin(npc) ?? npcSkin(npcOrbIdentity(npc));
  return <div className="npc-portrait" aria-hidden="true">{skin ? <SkinSprite skin={skin} facing="down" phase="stand" size={64} colors={npcColors(skin)} /> : <NpcOrb npc={npc} size={32} />}</div>;
}