import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { publishOrb } from '@/lib/orb';
import SkinSprite from '@/components/SkinSprite';
import { isPlayerSkin, normalizeSkinKey, resolveColors, skinBaseColor, skinPublic, useSkins, START_SKIN, type Facing, type Skin } from '@/lib/skins';

const rpc = (fn: string, args: Record<string, unknown>) => (supabase.rpc as unknown as (f: string, a: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>)(fn, args);

const TURN: Record<Facing, Facing> = { down: 'right', right: 'up', up: 'left', left: 'down' };

type Props = {
  auraColor: string | null;
  orbDye: string | null;
  registrationNumber: number | null;
  avatarBody: string | null;
  onEquipped: (skin: string, name: string) => void;
};

/** WARDROBE: owned skins can be worn; unfound skins stay nameless silhouettes. */
export default function Wardrobe({ auraColor, orbDye, registrationNumber, avatarBody, onEquipped }: Props) {
  const skins = useSkins().filter(isPlayerSkin);
  const [owned, setOwned] = useState<Set<string>>(new Set([START_SKIN]));
  const [facings, setFacings] = useState<Record<string, Facing>>({});
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    let off = false;
    void rpc('my_skins', {}).then(({ data, error }) => {
      if (off || error || !Array.isArray(data)) return;
      setOwned(new Set([START_SKIN, ...(data as string[])]));
    }).catch(() => undefined);
    return () => { off = true; };
  }, []);

  const equipped = normalizeSkinKey(avatarBody);
  const ownedCount = skins.filter(s => owned.has(s.skin_key)).length;

  const equip = async (skin: Skin) => {
    if (busy || skin.skin_key === equipped) return;
    setBusy(true); setNote('');
    try {
      const { data, error } = await rpc('equip_skin', { p_skin: skin.skin_key });
      const res = data as { ok?: boolean; skin?: string; name?: string } | null;
      if (error || !res?.ok) { setNote('The suit refuses you.'); return; }
      publishOrb({ aura_color: auraColor, orb_dye: orbDye, avatar_body: res.skin ?? skin.skin_key });
      onEquipped(res.skin ?? skin.skin_key, res.name ?? skin.name);
      setNote(`Now wearing ${res.name ?? skin.name}.`);
    } catch { setNote('The suit refuses you.'); }
    finally { setBusy(false); }
  };

  if (!skins.length) return null;
  return (
    <div style={{ marginTop: 24 }}>
      <div className="profile-section-label font-mono"><span>WARDROBE</span><span>{ownedCount} of {skins.length} found</span></div>
      <div className="profile-inventory-grid" style={{ marginTop: 12 }}>
        {skins.map(skin => {
          const has = owned.has(skin.skin_key);
          const wearing = skin.skin_key === equipped;
          const tone = skinBaseColor(skin, { auraColor, orbDye, registrationNumber });
          const info = skinPublic(skin, has);
          return (
            <button
              key={skin.skin_key}
              type="button"
              className={`profile-inventory-tile ${has ? 'profile-drop-filled' : 'profile-tile-empty'}`}
              aria-label={has ? info.name : 'Not yet found'}
              onClick={() => { if (has) void equip(skin); }}
              style={{ cursor: has && !wearing ? 'pointer' : 'default', position: 'relative' }}
            >
              <span className="profile-drop-body">
                <span onClick={e => { e.stopPropagation(); setFacings(f => ({ ...f, [skin.skin_key]: TURN[f[skin.skin_key] ?? 'down'] })); }}>
                  <SkinSprite skin={skin} facing={facings[skin.skin_key] ?? 'down'} size={40} colors={resolveColors(skin, tone.base)} prism={tone.prism} glow={has && tone.dyed ? tone.base : null} silhouette={!has} />
                </span>
                <span className="font-fell italic">{info.name}</span>
                {has && info.rarity && info.rarity !== 'start' && <span className="drop-rarity-chip font-mono">{info.rarity.toUpperCase()}</span>}
                {wearing && <span className="profile-carried-label font-mono">WEARING</span>}
              </span>
            </button>
          );
        })}
      </div>
      {note && <p className="font-fell italic" style={{ textAlign: 'center', fontSize: 13, color: 'var(--plate-label)', marginTop: 10 }}>{note}</p>}
    </div>
  );
}
