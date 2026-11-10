import { flagNumber } from '@/lib/flagValues';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { NPC_DIALOGUE_CLOSED } from '@/hooks/useNpcQuestStates';
import NpcPortrait from '@/components/NpcPortrait';
import { supabase } from '@/lib/supabase';
import { SAM_KEYS, currentStage, dialoguePages, dropNames, fillName, loadSam, pickNode, receiptLine, runStage, samFlags, cardTopics, topicRoot, entryVisible, type BookNode, type SamStage } from '@/lib/worldSam';

export const NOTE_ERROR = 'That didn\'t work. Try again in a moment.';

const SHOW_ASK_ABOUT = false;
type Props = { userId: string; npcKey: string; playerName: string; fallbackName: string; onClose: () => void; onRewarded?: () => void | Promise<void> };
export default function SamCard({ userId, npcKey, playerName, fallbackName, onClose, onRewarded }: Props) {
  useEffect(() => () => { window.dispatchEvent(new Event(NPC_DIALOGUE_CLOSED)); }, []);
  const [sam, setSam] = useState<Awaited<ReturnType<typeof loadSam>>>(null);
  const [stage, setStage] = useState<SamStage | null>(null);
  const [checked, setChecked] = useState(false);
  const [samStage, setSamStage] = useState(0);
  const [flags, setFlags] = useState<Record<string, string>>({});
  const [receipt, setReceipt] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const flight = useRef(false);
  const [node, setNode] = useState<BookNode | null>(null);
  const [page, setPage] = useState(0);
  const refresh = useCallback(async (data = sam) => {
    if (!data) return;
    const [next, all] = await Promise.all([currentStage(userId, data.stages), samFlags(userId)]);
    setStage(next); setPage(0); setFlags(all); setSamStage(Math.trunc(flagNumber(all, 'sam_stage'))); setChecked(true);
  }, [sam, userId]);
  useEffect(() => { let off = false; void loadSam(npcKey).then(d => { if (off) return; setSam(d); if (d) void refresh(d); else setChecked(true); }); return () => { off = true; }; }, [npcKey, userId]); // eslint-disable-line react-hooks/exhaustive-deps
  const name = (t: string) => fillName(t, playerName);
  const pages = dialoguePages(stage?.text ?? '');
  const lastPage = page >= pages.length - 1;
  const decline = async () => {
    if (!stage || flight.current) return;
    flight.current = true; setBusy(true); setError('');
    try {
      const { data, error: rpcError } = await (supabase.rpc as unknown as (fn: string, args: { p_stage: string }) => Promise<{ data: { ok?: boolean } | null; error: unknown }>)('npc_decline', { p_stage: stage.id });
      if (rpcError || data?.ok === false) { setError(NOTE_ERROR); return; }
      onClose();
    } catch { setError(NOTE_ERROR); }
    finally { flight.current = false; setBusy(false); }
  };
  const press = async () => {
    if (!stage || flight.current) return;
    flight.current = true; setBusy(true); setError('');
    try {
      const res = await runStage(stage.id, userId);
      if (res.ok) {
        setReceipt(receiptLine(res.given, await dropNames()));
        await onRewarded?.();
        await refresh();
      } else {
        setError('handInFailed' in res && res.handInFailed ? res.reason ?? NOTE_ERROR : NOTE_ERROR);
        console.error(`run_npc_stage failed for stage ${stage.id}`, res.reason);
      }
    } catch (err) {
      setError(NOTE_ERROR);
      console.error(`run_npc_stage failed for stage ${stage.id}`, err);
    } finally { flight.current = false; setBusy(false); }
  };
  const go = (target: string | null | undefined) => setNode(target && sam ? pickNode(sam.book, target) : null);
  return <>
    <NpcPortrait npc={npcKey} />
    <h2 className="font-cinzel">{sam?.npc.name ?? fallbackName}</h2>
    {!checked ? <p className="font-fell">…</p> : SHOW_ASK_ABOUT && node ? <>
      <p className="font-fell">{name(node.text)}</p>
      {node.option_a_label && <Button variant="outline" className="world-jump" onClick={() => go(node.option_a_target)}>{node.option_a_label}</Button>}
      {node.option_b_label && <Button variant="outline" className="world-jump" onClick={() => go(node.option_b_target)}>{node.option_b_label}</Button>}
      {!node.option_a_label && !node.option_b_label && <Button variant="outline" className="world-jump" onClick={() => setNode(null)}>Back</Button>}
    </> : <>
      {(stage || SAM_KEYS.has(npcKey)) && <p className="font-fell">{stage ? name(pages[page] ?? '') : 'Sam pokes the fire.'}</p>}
      {receipt && page === 0 && <p className="font-mono world-receipt">{receipt}</p>}
      {stage && !lastPage ? <Button className="world-jump" disabled={busy} onClick={() => { setPage(p => p + 1); setReceipt(''); }}>Go on</Button> : <div className="flex gap-2">
        {stage?.button_label && <Button className="world-jump flex-1 h-auto whitespace-normal" disabled={busy} onClick={() => void press()}>{busy ? '…' : stage.button_label}</Button>}
        {stage?.decline_label && <Button variant="outline" className="world-jump flex-1 h-auto whitespace-normal" disabled={busy} onClick={() => void decline()}>{busy ? '…' : stage.decline_label}</Button>}
        {!stage?.button_label && !stage?.decline_label && <Button className="world-jump" onClick={onClose}>Goodbye</Button>}
      </div>}
      {error && <p className="font-mono world-card-error">{error}</p>}
      {SHOW_ASK_ABOUT && <>
      <h3 className="font-mono world-topics-title">Ask about…</h3>
      <div className="world-topics">{(sam ? cardTopics(samStage, sam.book, flags, npcKey) : []).map(t => <Button key={t.key} variant="ghost" className="font-fell" onClick={() => go(sam ? topicRoot(sam.book.filter(e => entryVisible(e, flags)), t.key) : null)}>{t.label}</Button>)}</div>
      </>}
    </>}
  </>;
}
