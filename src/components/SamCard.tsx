import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import NpcPortrait from '@/components/NpcPortrait';
import { currentStage, dropNames, fillName, loadSam, pickNode, receiptLine, runStage, samFlags, cardTopics, topicRoot, entryVisible, type BookNode, type SamStage } from '@/lib/worldSam';

export const NOTE_ERROR = 'That didn\'t work. Try again in a moment.';

type Props = { userId: string; npcKey: string; playerName: string; fallbackName: string; onRewarded?: () => void | Promise<void> };
export default function SamCard({ userId, npcKey, playerName, fallbackName, onRewarded }: Props) {
  const [sam, setSam] = useState<Awaited<ReturnType<typeof loadSam>>>(null);
  const [stage, setStage] = useState<SamStage | null>(null);
  const [checked, setChecked] = useState(false);
  const [samStage, setSamStage] = useState(0);
  const [flags, setFlags] = useState<Record<string, string>>({});
  const [receipt, setReceipt] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [node, setNode] = useState<BookNode | null>(null);
  const refresh = useCallback(async (data = sam) => {
    if (!data) return;
    const [next, all] = await Promise.all([currentStage(userId, data.stages), samFlags(userId)]);
    setStage(next); setFlags(all); setSamStage(parseInt(all.sam_stage ?? '0', 10) || 0); setChecked(true);
  }, [sam, userId]);
  useEffect(() => { let off = false; void loadSam(npcKey).then(d => { if (off) return; setSam(d); if (d) void refresh(d); else setChecked(true); }); return () => { off = true; }; }, [npcKey, userId]); // eslint-disable-line react-hooks/exhaustive-deps
  const name = (t: string) => fillName(t, playerName);
  const press = async () => {
    if (!stage || busy) return;
    setBusy(true); setError('');
    try {
      const res = await runStage(stage.id);
      if (res.ok) {
        setReceipt(receiptLine(res.given, await dropNames()));
        await onRewarded?.();
        await refresh();
      } else {
        setError(NOTE_ERROR);
        console.error(`run_npc_stage failed for stage ${stage.id}`, res.reason);
      }
    } catch (err) {
      setError(NOTE_ERROR);
      console.error(`run_npc_stage failed for stage ${stage.id}`, err);
    } finally { setBusy(false); }
  };
  const go = (target: string | null | undefined) => setNode(target && sam ? pickNode(sam.book, target) : null);
  return <>
    <NpcPortrait npc={npcKey} />
    <h2 className="font-cinzel">{sam?.npc.name ?? fallbackName}</h2>
    {!checked ? <p className="font-fell">…</p> : node ? <>
      <p className="font-fell">{name(node.text)}</p>
      {node.option_a_label && <Button variant="outline" className="world-jump" onClick={() => go(node.option_a_target)}>{node.option_a_label}</Button>}
      {node.option_b_label && <Button variant="outline" className="world-jump" onClick={() => go(node.option_b_target)}>{node.option_b_label}</Button>}
      {!node.option_a_label && !node.option_b_label && <Button variant="outline" className="world-jump" onClick={() => setNode(null)}>Back</Button>}
    </> : <>
      <p className="font-fell">{stage ? name(stage.text) : 'Sam pokes the fire.'}</p>
      {stage?.button_label && <Button className="world-jump" disabled={busy} onClick={() => void press()}>{busy ? '…' : stage.button_label}</Button>}
      {error && <p className="font-mono world-card-error">{error}</p>}
      {receipt && <p className="font-mono world-receipt">{receipt}</p>}
      <h3 className="font-mono world-topics-title">Ask about…</h3>
      <div className="world-topics">{(sam ? cardTopics(samStage, sam.book, flags) : []).map(t => <Button key={t.key} variant="ghost" className="font-fell" onClick={() => go(sam ? topicRoot(sam.book.filter(e => entryVisible(e, flags)), t.key) : null)}>{t.label}</Button>)}</div>
    </>}
  </>;
}
