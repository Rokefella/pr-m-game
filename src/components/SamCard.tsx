import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { currentStage, dropNames, fillName, loadSam, pickNode, receiptLine, runStage, samStageFlag, samTopics, topicRoot, type BookNode, type SamStage } from '@/lib/worldSam';

type Props = { userId: string; npcKey: string; playerName: string; fallbackName: string; onRewarded?: () => void };
export default function SamCard({ userId, npcKey, playerName, fallbackName, onRewarded }: Props) {
  const [sam, setSam] = useState<Awaited<ReturnType<typeof loadSam>>>(null);
  const [stage, setStage] = useState<SamStage | null>(null);
  const [checked, setChecked] = useState(false);
  const [samStage, setSamStage] = useState(0);
  const [receipt, setReceipt] = useState('');
  const [busy, setBusy] = useState(false);
  const [node, setNode] = useState<BookNode | null>(null);
  const refresh = useCallback(async (data = sam) => {
    if (!data) return;
    const [next, flag] = await Promise.all([currentStage(userId, data.stages), samStageFlag(userId)]);
    setStage(next); setSamStage(flag); setChecked(true);
  }, [sam, userId]);
  useEffect(() => { let off = false; void loadSam(npcKey).then(d => { if (off) return; setSam(d); if (d) void refresh(d); else setChecked(true); }); return () => { off = true; }; }, [npcKey, userId]); // eslint-disable-line react-hooks/exhaustive-deps
  const name = (t: string) => fillName(t, playerName);
  const press = async () => {
    if (!stage || busy) return;
    setBusy(true);
    try {
      const res = await runStage(stage.id);
      if (res.ok) { setReceipt(receiptLine(res.given, await dropNames())); onRewarded?.(); await refresh(); }
    } finally { setBusy(false); }
  };
  const go = (target: string | null | undefined) => setNode(target && sam ? pickNode(sam.book, target) : null);
  return <>
    <h2 className="font-cinzel">{sam?.npc.name ?? fallbackName}</h2>
    {!checked ? <p className="font-fell">…</p> : node ? <>
      <p className="font-fell">{name(node.text)}</p>
      {node.option_a_label && <Button variant="outline" className="world-jump" onClick={() => go(node.option_a_target)}>{node.option_a_label}</Button>}
      {node.option_b_label && <Button variant="outline" className="world-jump" onClick={() => go(node.option_b_target)}>{node.option_b_label}</Button>}
      {!node.option_a_label && !node.option_b_label && <Button variant="outline" className="world-jump" onClick={() => setNode(null)}>Back</Button>}
    </> : <>
      <p className="font-fell">{stage ? name(stage.text) : 'Sam pokes the fire.'}</p>
      {stage?.button_label && <Button className="world-jump" disabled={busy} onClick={() => void press()}>{busy ? '…' : stage.button_label}</Button>}
      {receipt && <p className="font-mono world-receipt">{receipt}</p>}
      <h3 className="font-mono world-topics-title">Ask about…</h3>
      <div className="world-topics">{samTopics(samStage).map(t => ({ ...t, root: sam && pickNode(sam.book, topicRoot(t.key)) ? topicRoot(t.key) : t.key })).filter(t => sam && pickNode(sam.book, t.root)).map(t => <Button key={t.key} variant="ghost" onClick={() => go(t.root)}>{t.label}</Button>)}</div>
    </>}
  </>;
}
