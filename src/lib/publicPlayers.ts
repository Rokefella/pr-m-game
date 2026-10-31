import { supabase } from './supabase';

export type PublicPlayer = { id: string; registration_number: number | null; username: string | null; title: string | null; level: number; aura_color: string | null; orb_dye: string | null; avatar_body: string | null; avatar_head: string | null; avatar_hat: string | null };
/** Other-player identity is available only through the safe public projection. */
export async function publicPlayers(ids: string[]): Promise<PublicPlayer[]> {
  if (!ids.length) return [];
  const { data, error } = await supabase.rpc('public_players', { p_ids: [...new Set(ids)] });
  if (error) throw error;
  return Array.isArray(data) ? data as PublicPlayer[] : [];
}